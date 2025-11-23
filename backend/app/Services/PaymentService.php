<?php

namespace App\Services;

use App\Models\Member;
use App\Models\Payment;
use App\Models\PaymentReceipt;
use App\Models\Wallet;
use Dompdf\Dompdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        private readonly WalletService $walletService,
        private readonly QrCodeService $qrCodeService,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public function handleMpesaCallback(array $payload): void
    {
        DB::transaction(function () use ($payload) {
            $member = Member::where('phone', $payload['msisdn'])->first();
            if (! $member) {
                throw new \RuntimeException('Member not found for MSISDN ' . $payload['msisdn']);
            }

            $wallet = $this->walletService->ensureWallet($member);

            $payment = Payment::create([
                'member_id' => $member->id,
                'channel' => 'mpesa',
                'provider_reference' => $payload['transaction_id'],
                'amount' => $payload['amount'],
                'currency' => 'KES',
                'status' => $payload['result_code'] === '0' ? 'completed' : 'failed',
                'payload' => $payload['payload'] ?? null,
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
            }

            $this->auditLogger->log(
                null,
                'payment.mpesa_callback',
                $payment,
                ['result_code' => $payload['result_code']]
            );
        });
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

        $html = view('pdf.receipt', [
            'payment' => $payment,
            'receiptNumber' => $receiptNumber,
            'qrImage' => $qrBase64,
            'notes' => $notes,
        ])->render();

        $dompdf = new Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->render();

        $fileName = 'receipts/' . $receiptNumber . '.pdf';
        Storage::disk('public')->put($fileName, $dompdf->output());

        return $fileName;
    }
}

