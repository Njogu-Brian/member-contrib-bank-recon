<?php

namespace App\Observers;

use App\Models\Transaction;
use App\Services\InvoicePaymentMatcher;
use Illuminate\Support\Facades\Log;

class TransactionObserver
{
    /**
     * Handle the Transaction "created" event.
     */
    public function created(Transaction $transaction): void
    {
        // Auto-match to invoices if transaction has a member
        if ($transaction->member_id && $transaction->credit > 0) {
            try {
                $matcher = app(InvoicePaymentMatcher::class);
                $matcher->matchTransactionToInvoices($transaction);
            } catch (\Exception $e) {
                Log::error('Failed to auto-match transaction to invoices', [
                    'transaction_id' => $transaction->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Handle the Transaction "updated" event.
     */
    public function updated(Transaction $transaction): void
    {
        // If member_id was just assigned, try to match to invoices
        if ($transaction->isDirty('member_id') && $transaction->member_id && $transaction->credit > 0) {
            try {
                $matcher = app(InvoicePaymentMatcher::class);
                $matcher->matchTransactionToInvoices($transaction);
            } catch (\Exception $e) {
                Log::error('Failed to auto-match transaction to invoices on update', [
                    'transaction_id' => $transaction->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Handle the Transaction "deleted" event.
     */
    public function deleted(Transaction $transaction): void
    {
        //
    }

    /**
     * Handle the Transaction "restored" event.
     */
    public function restored(Transaction $transaction): void
    {
        //
    }

    /**
     * Handle the Transaction "force deleted" event.
     */
    public function forceDeleted(Transaction $transaction): void
    {
        //
    }
}
