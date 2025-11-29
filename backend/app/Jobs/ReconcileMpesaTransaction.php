<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\MpesaReconciliationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ReconcileMpesaTransaction implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Payment $payment
    ) {
    }

    public function handle(MpesaReconciliationService $reconciliationService): void
    {
        try {
            Log::info('Starting MPESA reconciliation', [
                'payment_id' => $this->payment->id,
                'mpesa_transaction_id' => $this->payment->mpesa_transaction_id,
            ]);

            $result = $reconciliationService->reconcilePayment($this->payment);

            Log::info('MPESA reconciliation completed', [
                'payment_id' => $this->payment->id,
                'status' => $result['status'],
            ]);
        } catch (\Exception $e) {
            Log::error('MPESA reconciliation failed', [
                'payment_id' => $this->payment->id,
                'error' => $e->getMessage(),
            ]);

            // Mark payment reconciliation as error
            $this->payment->update([
                'reconciliation_status' => 'error',
            ]);

            throw $e;
        }
    }
}

