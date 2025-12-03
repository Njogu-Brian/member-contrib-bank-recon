<?php

namespace App\Observers;

use App\Models\ManualContribution;
use App\Services\InvoicePaymentMatcher;
use Illuminate\Support\Facades\Log;

class ManualContributionObserver
{
    /**
     * Handle the ManualContribution "created" event.
     */
    public function created(ManualContribution $manualContribution): void
    {
        // Auto-match to invoices
        if ($manualContribution->member_id && $manualContribution->amount > 0) {
            try {
                $matcher = app(InvoicePaymentMatcher::class);
                $matcher->matchManualContributionToInvoices($manualContribution);
            } catch (\Exception $e) {
                Log::error('Failed to auto-match manual contribution to invoices', [
                    'contribution_id' => $manualContribution->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Handle the ManualContribution "updated" event.
     */
    public function updated(ManualContribution $manualContribution): void
    {
        //
    }

    /**
     * Handle the ManualContribution "deleted" event.
     */
    public function deleted(ManualContribution $manualContribution): void
    {
        //
    }

    /**
     * Handle the ManualContribution "restored" event.
     */
    public function restored(ManualContribution $manualContribution): void
    {
        //
    }

    /**
     * Handle the ManualContribution "force deleted" event.
     */
    public function forceDeleted(ManualContribution $manualContribution): void
    {
        //
    }
}
