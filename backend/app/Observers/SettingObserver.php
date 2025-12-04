<?php

namespace App\Observers;

use App\Models\Setting;
use App\Models\Invoice;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SettingObserver
{
    /**
     * Handle the Setting "updated" event.
     */
    public function updated(Setting $setting)
    {
        // Only handle contribution_start_date changes
        if ($setting->key !== 'contribution_start_date') {
            return;
        }

        // Get old and new dates
        $oldDate = $setting->getOriginal('value');
        $newDate = $setting->value;

        if ($oldDate === $newDate) {
            return; // No actual change
        }

        try {
            $oldCarbon = Carbon::parse($oldDate);
            $newCarbon = Carbon::parse($newDate);

            Log::info('Contribution start date changed', [
                'old_date' => $oldDate,
                'new_date' => $newDate,
            ]);

            if ($newCarbon->greaterThan($oldCarbon)) {
                // Date pushed forward - DELETE weekly invoices before new date
                $this->deleteInvoicesBeforeDate($newCarbon);
            } elseif ($newCarbon->lessThan($oldCarbon)) {
                // Date pushed back - GENERATE invoices for new period
                $this->generateInvoicesForNewPeriod($newCarbon, $oldCarbon);
            }
        } catch (\Exception $e) {
            Log::error('Error handling contribution date change: ' . $e->getMessage());
        }
    }

    /**
     * Delete weekly contribution invoices before the new start date
     */
    protected function deleteInvoicesBeforeDate(Carbon $newStartDate)
    {
        $deleted = Invoice::where('invoice_type', Invoice::TYPE_WEEKLY)
            ->whereDate('issue_date', '<', $newStartDate)
            ->delete();

        Log::info("Deleted {$deleted} weekly invoices before new start date", [
            'new_start_date' => $newStartDate->format('Y-m-d'),
            'deleted_count' => $deleted,
        ]);

        // Show notification if we're in a request context
        if (app()->runningInConsole() === false) {
            session()->flash('success', "Deleted {$deleted} weekly invoices that were before the new start date.");
        }
    }

    /**
     * Generate weekly invoices for the new period (date pushed back)
     */
    protected function generateInvoicesForNewPeriod(Carbon $newStartDate, Carbon $oldStartDate)
    {
        $weeklyAmount = (float) Setting::get('weekly_contribution_amount', 1000);
        
        // Get all weeks between new start and old start
        $currentWeek = $newStartDate->copy()->startOfWeek();
        $endWeek = $oldStartDate->copy()->startOfWeek()->subWeek(); // Stop before old start
        
        $weeks = [];
        while ($currentWeek->lte($endWeek)) {
            $weeks[] = [
                'period' => $currentWeek->format('Y-\WW'),
                'start' => $currentWeek->copy(),
                'end' => $currentWeek->copy()->endOfWeek(),
            ];
            $currentWeek->addWeek();
        }

        $allMembers = Member::where('is_active', true)->get();
        $generated = 0;

        foreach ($weeks as $weekData) {
            foreach ($allMembers as $member) {
                // Check if invoice already exists
                $exists = Invoice::where('member_id', $member->id)
                    ->where('period', $weekData['period'])
                    ->where('invoice_type', Invoice::TYPE_WEEKLY)
                    ->exists();

                if ($exists) {
                    continue;
                }

                // Create invoice for this week
                Invoice::create([
                    'member_id' => $member->id,
                    'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_WEEKLY, $weekData['start']),
                    'amount' => $weeklyAmount,
                    'issue_date' => $weekData['start'],
                    'due_date' => $weekData['end'],
                    'status' => 'pending',
                    'period' => $weekData['period'],
                    'invoice_type' => Invoice::TYPE_WEEKLY,
                    'description' => 'Weekly contribution for ' . $weekData['start']->format('M d, Y'),
                ]);

                $generated++;
            }
        }

        Log::info("Generated {$generated} weekly invoices for extended period", [
            'new_start_date' => $newStartDate->format('Y-m-d'),
            'old_start_date' => $oldStartDate->format('Y-m-d'),
            'weeks_added' => count($weeks),
            'generated_count' => $generated,
        ]);

        // Show notification
        if (app()->runningInConsole() === false) {
            session()->flash('success', "Generated {$generated} weekly invoices for the extended period.");
        }
    }
}
