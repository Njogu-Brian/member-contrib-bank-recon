<?php

namespace App\Services;

use App\Jobs\ReconcileMpesaTransaction;
use App\Models\Member;
use App\Models\Payment;
use App\Models\PaymentReceipt;
use App\Models\Wallet;
use App\Services\MpesaReconciliationService;
use Dompdf\Dompdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        private readonly WalletService $walletService,
        private readonly QrCodeService $qrCodeService,
        private readonly AuditLogger $auditLogger,
        private readonly MpesaReconciliationService $reconciliationService,
    ) {
    }

    public function handleMpesaCallback(array $payload): void
    {
        DB::transaction(function () use ($payload) {
            // Extract MPESA transaction details
            $mpesaTransactionId = $payload['transaction_id'] ?? $payload['MpesaReceiptNumber'] ?? null;
            $mpesaReceiptNumber = $payload['MpesaReceiptNumber'] ?? $payload['receipt_number'] ?? null;
            $msisdn = $payload['msisdn'] ?? $payload['MSISDN'] ?? $payload['phone_number'] ?? null;
            $amount = $payload['amount'] ?? $payload['TransAmount'] ?? 0;
            $resultCode = $payload['result_code'] ?? $payload['ResultCode'] ?? null;

            $member = Member::where('phone', $msisdn)->first();
            if (! $member) {
                Log::warning('Member not found for MPESA callback', [
                    'msisdn' => $msisdn,
                    'transaction_id' => $mpesaTransactionId,
                ]);
                throw new \RuntimeException('Member not found for MSISDN ' . $msisdn);
            }

            // Check for duplicate payment before creating
            if ($this->isDuplicatePayment($mpesaTransactionId, $mpesaReceiptNumber, $member->id, $amount)) {
                Log::warning('Duplicate MPESA payment detected', [
                    'msisdn' => $msisdn,
                    'transaction_id' => $mpesaTransactionId,
                    'receipt_number' => $mpesaReceiptNumber,
                ]);
                throw new \RuntimeException('Duplicate payment detected');
            }

            $wallet = $this->walletService->ensureWallet($member);

            $payment = Payment::create([
                'member_id' => $member->id,
                'channel' => 'mpesa',
                'provider_reference' => $mpesaTransactionId,
                'mpesa_transaction_id' => $mpesaTransactionId,
                'mpesa_receipt_number' => $mpesaReceiptNumber,
                'amount' => $amount,
                'currency' => 'KES',
                'status' => ($resultCode === '0' || $resultCode === 0) ? 'completed' : 'failed',
                'reconciliation_status' => 'pending',
                'payload' => $payload,
            ]);

            if ($payment->status === 'completed') {
                $contribution = $this->walletService->contribute($wallet->id, [
                    'amount' => $payment->amount,
                    'source' => 'mpesa',
                    'reference' => $payment->provider_reference,
                    'metadata' => $payload,
                ]);

                $payment->contribution()->associate($contribution);
                $payment->save();

                // Mark pending invoices as paid (oldest first, up to payment amount)
                $this->markInvoicesAsPaid($member, $payment);

                // Queue reconciliation job
                ReconcileMpesaTransaction::dispatch($payment);
            }

            $this->auditLogger->log(
                null,
                'payment.mpesa_callback',
                $payment,
                ['result_code' => $resultCode]
            );
        });
    }

    /**
     * Check if payment is duplicate
     */
    protected function isDuplicatePayment(?string $transactionId, ?string $receiptNumber, int $memberId, float $amount): bool
    {
        // Check by MPESA transaction ID
        if ($transactionId) {
            $existing = Payment::where('mpesa_transaction_id', $transactionId)
                ->where('member_id', $memberId)
                ->exists();

            if ($existing) {
                return true;
            }
        }

        // Check by receipt number
        if ($receiptNumber) {
            $existing = Payment::where('mpesa_receipt_number', $receiptNumber)
                ->where('member_id', $memberId)
                ->exists();

            if ($existing) {
                return true;
            }
        }

        // Check by amount and recent date (within last 5 minutes)
        $recentPayment = Payment::where('member_id', $memberId)
            ->where('amount', $amount)
            ->where('channel', 'mpesa')
            ->where('created_at', '>=', now()->subMinutes(5))
            ->exists();

        return $recentPayment;
    }
    
    /**
     * Mark invoices as paid with payment
     */
    protected function markInvoicesAsPaid(Member $member, Payment $payment): void
    {
        $remainingAmount = $payment->amount;
        
        // Get pending invoices ordered by due date (oldest first)
        $pendingInvoices = \App\Models\Invoice::where('member_id', $member->id)
            ->where('status', 'pending')
            ->orderBy('due_date', 'asc')
            ->get();
        
        foreach ($pendingInvoices as $invoice) {
            if ($remainingAmount <= 0) {
                break;
            }
            
            if ($remainingAmount >= $invoice->amount) {
                // Full payment
                $invoice->markAsPaid($payment);
                $remainingAmount -= $invoice->amount;
            } else {
                // Partial payment - mark as paid if it covers at least 50%
                if ($remainingAmount >= ($invoice->amount * 0.5)) {
                    $invoice->markAsPaid($payment);
                    $remainingAmount = 0;
                }
                break;
            }
        }
    }

    public function generateReceipt(int $paymentId, array $data = []): PaymentReceipt
    {
        $payment = Payment::with(['member', 'contribution'])->findOrFail($paymentId);

        return DB::transaction(function () use ($payment, $data) {
            $receiptNumber = strtoupper(Str::random(10));
            $qrPath = $this->qrCodeService->generate($receiptNumber);
            $pdfPath = $this->renderReceiptPdf($payment, $receiptNumber, $qrPath, $data['notes'] ?? null);

            $receipt = PaymentReceipt::updateOrCreate(
                ['payment_id' => $payment->id],
                [
                    'file_name' => basename($pdfPath),
                    'disk' => 'public',
                    'path' => $pdfPath,
                    'qr_code_path' => $qrPath,
                ]
            );

            $this->auditLogger->log(auth()->id(), 'payment.receipt_generated', $receipt);

            return $receipt;
        });
    }

    protected function renderReceiptPdf(Payment $payment, string $receiptNumber, string $qrPath, ?string $notes): string
    {
        $qrBinary = Storage::disk('public')->get($qrPath);
        $qrBase64 = 'data:image/png;base64,' . base64_encode($qrBinary);

        $html = $this->buildReceiptHtml($payment, $receiptNumber, $qrBase64, $notes);

        $dompdf = new Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->render();

        $fileName = 'receipts/' . $receiptNumber . '.pdf';
        Storage::disk('public')->put($fileName, $dompdf->output());

        return $fileName;
    }

    protected function buildReceiptHtml(Payment $payment, string $receiptNumber, string $qrImage, ?string $notes): string
    {
        $memberName = $payment->member?->name ?? 'N/A';
        $amount = number_format($payment->amount, 2);
        $channel = strtoupper($payment->channel);
        $reference = $payment->provider_reference ?? 'N/A';
        $date = optional($payment->created_at)->toDateTimeString();
        $notesRow = $notes ? "<tr><th>Notes</th><td>{$notes}</td></tr>" : '';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {$receiptNumber}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        .header { text-align: center; margin-bottom: 20px; }
        .details { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .details th, .details td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .qr { text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Evimeria Group Receipt</h2>
        <p>Receipt #: {$receiptNumber}</p>
    </div>

    <table class="details">
        <tr>
            <th>Member</th>
            <td>{$memberName}</td>
        </tr>
        <tr>
            <th>Amount</th>
            <td>{$amount} {$payment->currency}</td>
        </tr>
        <tr>
            <th>Channel</th>
            <td>{$channel}</td>
        </tr>
        <tr>
            <th>Reference</th>
            <td>{$reference}</td>
        </tr>
        <tr>
            <th>Date</th>
            <td>{$date}</td>
        </tr>
        {$notesRow}
    </table>

    <div class="qr">
        <p>Scan to verify</p>
        <img src="{$qrImage}" width="150" height="150" alt="QR Code">
    </div>
</body>
</html>
HTML;
    }
}

