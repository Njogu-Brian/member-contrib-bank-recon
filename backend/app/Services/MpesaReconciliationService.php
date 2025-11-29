<?php

namespace App\Services;

use App\Models\Member;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\MpesaReconciliationLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\AuditLogger;

class MpesaReconciliationService
{
    public function __construct(
        private readonly AuditLogger $auditLogger
    ) {
    }

    /**
     * Reconcile MPESA payment with bank transactions
     */
    public function reconcilePayment(Payment $payment, ?int $reconciledBy = null): array
    {
        if ($payment->channel !== 'mpesa') {
            throw new \Exception('Payment must be MPESA to reconcile');
        }

        if ($payment->isReconciled()) {
            throw new \Exception('Payment is already reconciled');
        }

        return DB::transaction(function () use ($payment, $reconciledBy) {
            // Check for duplicates first
            if ($this->isDuplicate($payment)) {
                $this->markAsDuplicate($payment, $reconciledBy);
                return [
                    'status' => 'duplicate',
                    'message' => 'Duplicate payment detected',
                ];
            }

            // Try to match with existing transaction
            $transaction = $this->findMatchingTransaction($payment);

            if ($transaction) {
                return $this->matchPaymentToTransaction($payment, $transaction, $reconciledBy);
            }

            // No match found
            return $this->markAsUnmatched($payment, $reconciledBy);
        });
    }

    /**
     * Check if payment is duplicate
     */
    protected function isDuplicate(Payment $payment): bool
    {
        // Check by MPESA transaction ID
        if ($payment->mpesa_transaction_id) {
            $existing = Payment::where('mpesa_transaction_id', $payment->mpesa_transaction_id)
                ->where('id', '!=', $payment->id)
                ->exists();

            if ($existing) {
                return true;
            }
        }

        // Check by receipt number
        if ($payment->mpesa_receipt_number) {
            $existing = Payment::where('mpesa_receipt_number', $payment->mpesa_receipt_number)
                ->where('id', '!=', $payment->id)
                ->exists();

            if ($existing) {
                return true;
            }
        }

        // Check by provider reference, amount, and date
        if ($payment->provider_reference && $payment->member_id) {
            $existing = Payment::where('provider_reference', $payment->provider_reference)
                ->where('member_id', $payment->member_id)
                ->where('amount', $payment->amount)
                ->where('id', '!=', $payment->id)
                ->whereDate('created_at', $payment->created_at->toDateString())
                ->exists();

            if ($existing) {
                return true;
            }
        }

        return false;
    }

    /**
     * Find matching transaction for payment
     */
    protected function findMatchingTransaction(Payment $payment): ?Transaction
    {
        if (!$payment->member_id) {
            return null;
        }

        // Try matching by MPESA receipt number in transaction code
        if ($payment->mpesa_receipt_number) {
            $transaction = Transaction::where('member_id', $payment->member_id)
                ->where('transaction_code', $payment->mpesa_receipt_number)
                ->where('credit', $payment->amount)
                ->where('assignment_status', '!=', 'duplicate')
                ->where('is_archived', false)
                ->whereDate('tran_date', $payment->created_at->toDateString())
                ->first();

            if ($transaction) {
                return $transaction;
            }
        }

        // Try matching by amount and date range (within 1 day)
        $dateStart = $payment->created_at->copy()->subDay();
        $dateEnd = $payment->created_at->copy()->addDay();
        
        $matchedTransactionIds = MpesaReconciliationLog::where('status', 'matched')
            ->whereNotNull('transaction_id')
            ->pluck('transaction_id')
            ->toArray();
        
        $transaction = Transaction::where('member_id', $payment->member_id)
            ->where('credit', $payment->amount)
            ->where('assignment_status', '!=', 'duplicate')
            ->where('is_archived', false)
            ->whereBetween('tran_date', [
                $dateStart->toDateString(),
                $dateEnd->toDateString(),
            ])
            ->whereNotIn('id', $matchedTransactionIds)
            ->first();

        return $transaction;
    }

    /**
     * Match payment to transaction
     */
    protected function matchPaymentToTransaction(Payment $payment, Transaction $transaction, ?int $reconciledBy): array
    {
        $payment->update([
            'reconciliation_status' => 'reconciled',
            'reconciled_at' => now(),
            'reconciled_by' => $reconciledBy ?? auth()->id(),
        ]);

        MpesaReconciliationLog::create([
            'payment_id' => $payment->id,
            'transaction_id' => $transaction->id,
            'status' => 'matched',
            'reconciled_at' => now(),
            'reconciled_by' => $reconciledBy ?? auth()->id(),
            'notes' => 'Automatically matched via reconciliation service',
        ]);

        $this->auditLogger->log(
            $reconciledBy ?? auth()->id(),
            'payment.reconciled',
            $payment,
            ['transaction_id' => $transaction->id]
        );

        return [
            'status' => 'matched',
            'message' => 'Payment matched to transaction',
            'transaction_id' => $transaction->id,
        ];
    }

    /**
     * Mark payment as unmatched
     */
    protected function markAsUnmatched(Payment $payment, ?int $reconciledBy): array
    {
        $payment->update([
            'reconciliation_status' => 'unmatched',
        ]);

        MpesaReconciliationLog::create([
            'payment_id' => $payment->id,
            'status' => 'unmatched',
            'notes' => 'No matching transaction found',
        ]);

        return [
            'status' => 'unmatched',
            'message' => 'No matching transaction found',
        ];
    }

    /**
     * Mark payment as duplicate
     */
    protected function markAsDuplicate(Payment $payment, ?int $reconciledBy): void
    {
        $payment->update([
            'reconciliation_status' => 'duplicate',
        ]);

        MpesaReconciliationLog::create([
            'payment_id' => $payment->id,
            'status' => 'duplicate',
            'notes' => 'Duplicate payment detected',
        ]);

        $this->auditLogger->log(
            $reconciledBy ?? auth()->id(),
            'payment.duplicate_detected',
            $payment,
            []
        );
    }

    /**
     * Retry reconciliation for a payment
     */
    public function retryReconciliation(Payment $payment, ?int $reconciledBy = null): array
    {
        // Reset reconciliation status
        $payment->update([
            'reconciliation_status' => 'pending',
            'reconciled_at' => null,
            'reconciled_by' => null,
        ]);

        // Delete previous logs
        $payment->reconciliationLogs()->delete();

        // Retry reconciliation
        return $this->reconcilePayment($payment, $reconciledBy);
    }

    /**
     * Get reconciliation logs
     */
    public function getReconciliationLogs(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        try {
            $query = MpesaReconciliationLog::query();

            if (!empty($filters['status']) && $filters['status'] !== '') {
                $query->where('status', $filters['status']);
            }

            if (!empty($filters['payment_id'])) {
                $query->where('payment_id', $filters['payment_id']);
            }

            if (!empty($filters['transaction_id'])) {
                $query->where('transaction_id', $filters['transaction_id']);
            }

            if (!empty($filters['date_from'])) {
                $query->whereDate('created_at', '>=', $filters['date_from']);
            }

            if (!empty($filters['date_to'])) {
                $query->whereDate('created_at', '<=', $filters['date_to']);
            }

            $perPage = isset($filters['per_page']) && $filters['per_page'] > 0 ? (int) $filters['per_page'] : 15;
            $page = isset($filters['page']) && $filters['page'] > 0 ? (int) $filters['page'] : 1;

            $result = $query->orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);
            
            // Load relationships after pagination, only if there are items
            if ($result->count() > 0) {
                try {
                    $result->load([
                        'payment' => function($q) {
                            $q->with('member');
                        },
                        'reconciledBy'
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Failed to load relationships in reconciliation logs', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Error in getReconciliationLogs: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'filters' => $filters,
            ]);
            throw $e;
        }
    }
}

