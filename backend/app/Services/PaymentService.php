<?php

namespace App\Services;

use App\Jobs\ReconcileMpesaTransaction;
use App\Models\Member;
use App\Models\Payment;
use App\Models\PaymentReceipt;
use App\Models\Wallet;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Services\MpesaReconciliationService;
use App\Services\AccountingService;
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
        private readonly AccountingService $accountingService,
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

            // Generate idempotency key from transaction ID
            $idempotencyKey = $mpesaTransactionId ? 'mpesa_' . $mpesaTransactionId : 'mpesa_' . Str::random(32);

            // Check for duplicate payment before creating (using idempotency key)
            if ($this->isDuplicatePayment($mpesaTransactionId, $mpesaReceiptNumber, $member->id, $amount, $idempotencyKey)) {
                Log::warning('Duplicate MPESA payment detected', [
                    'msisdn' => $msisdn,
                    'transaction_id' => $mpesaTransactionId,
                    'receipt_number' => $mpesaReceiptNumber,
                    'idempotency_key' => $idempotencyKey,
                ]);
                throw new \RuntimeException('Duplicate payment detected');
            }

            $wallet = $this->walletService->ensureWallet($member);

            // Create payment with idempotency key
            $payment = Payment::create([
                'member_id' => $member->id,
                'channel' => 'mpesa',
                'provider_reference' => $mpesaTransactionId,
                'mpesa_transaction_id' => $mpesaTransactionId,
                'mpesa_receipt_number' => $mpesaReceiptNumber,
                'idempotency_key' => $idempotencyKey,
                'amount' => $amount,
                'currency' => 'KES',
                'status' => ($resultCode === '0' || $resultCode === 0) ? 'completed' : 'failed',
                'reconciliation_status' => 'pending',
                'payload' => $payload,
            ]);

            if ($payment->status === 'completed') {
                // Validate amount is positive
                if ($payment->amount <= 0) {
                    Log::error('Invalid payment amount', [
                        'payment_id' => $payment->id,
                        'amount' => $payment->amount,
                    ]);
                    throw new \RuntimeException('Payment amount must be greater than 0');
                }

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

                // Post to ledger (atomic with payment creation)
                $this->postPaymentToLedger($payment);

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
    protected function isDuplicatePayment(?string $transactionId, ?string $receiptNumber, int $memberId, float $amount, ?string $idempotencyKey = null): bool
    {
        // Check by idempotency key first (most reliable)
        if ($idempotencyKey) {
            $existing = Payment::where('idempotency_key', $idempotencyKey)->exists();
            if ($existing) {
                return true;
            }
        }

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
     * Post payment to general ledger using double-entry bookkeeping
     */
    protected function postPaymentToLedger(Payment $payment): void
    {
        try {
            // Get or find cash account (asset) - typically code '1101' or '1102'
            $cashAccount = ChartOfAccount::where('code', '1101')
                ->orWhere('code', '1102')
                ->where('type', 'asset')
                ->where('is_active', true)
                ->first();

            // Get or find contributions receivable/revenue account - typically code '4100'
            $revenueAccount = ChartOfAccount::where('code', '4100')
                ->where('type', 'revenue')
                ->where('is_active', true)
                ->first();

            // If accounts don't exist, create them or use defaults
            if (!$cashAccount) {
                $cashAccount = ChartOfAccount::firstOrCreate(
                    ['code' => '1101'],
                    [
                        'name' => 'Cash on Hand',
                        'type' => 'asset',
                        'is_active' => true,
                    ]
                );
            }

            if (!$revenueAccount) {
                $revenueAccount = ChartOfAccount::firstOrCreate(
                    ['code' => '4100'],
                    [
                        'name' => 'Member Contributions',
                        'type' => 'revenue',
                        'is_active' => true,
                    ]
                );
            }

            // Get or create accounting period
            $period = $this->accountingService->getOrCreatePeriod(now());

            // Calculate running balances
            $cashLastBalance = GeneralLedger::where('account_id', $cashAccount->id)
                ->where('entry_date', '<=', now())
                ->orderBy('entry_date', 'desc')
                ->orderBy('id', 'desc')
                ->value('running_balance') ?? 0;

            $revenueLastBalance = GeneralLedger::where('account_id', $revenueAccount->id)
                ->where('entry_date', '<=', now())
                ->orderBy('entry_date', 'desc')
                ->orderBy('id', 'desc')
                ->value('running_balance') ?? 0;

            // Post debit to cash (asset increases)
            GeneralLedger::create([
                'account_id' => $cashAccount->id,
                'period_id' => $period->id,
                'entry_date' => $payment->created_at ?? now(),
                'debit' => $payment->amount,
                'credit' => 0,
                'running_balance' => $cashLastBalance + $payment->amount, // Asset: debit increases
                'reference_type' => Payment::class,
                'reference_id' => $payment->id,
                'description' => 'MPESA Payment - ' . ($payment->member->name ?? 'Member'),
            ]);

            // Post credit to revenue (revenue increases)
            GeneralLedger::create([
                'account_id' => $revenueAccount->id,
                'period_id' => $period->id,
                'entry_date' => $payment->created_at ?? now(),
                'debit' => 0,
                'credit' => $payment->amount,
                'running_balance' => $revenueLastBalance + $payment->amount, // Revenue: credit increases
                'reference_type' => Payment::class,
                'reference_id' => $payment->id,
                'description' => 'Member Contribution - ' . ($payment->member->name ?? 'Member'),
            ]);

            Log::info('Payment posted to ledger', [
                'payment_id' => $payment->id,
                'amount' => $payment->amount,
                'cash_account' => $cashAccount->code,
                'revenue_account' => $revenueAccount->code,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to post payment to ledger', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Don't throw - log error but allow payment to complete
            // This ensures payment is recorded even if ledger posting fails
        }
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

