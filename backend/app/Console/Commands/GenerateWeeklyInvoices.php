<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Member;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateWeeklyInvoices extends Command
{
    protected $signature = 'invoices:generate-weekly {--force : Force generation even if already generated}';
    protected $description = 'Generate weekly contribution invoices for all active members';

    public function handle()
    {
        $weeklyAmount = (float) Setting::get('weekly_contribution_amount', 1000);
        $invoiceStartDate = Setting::get('contribution_start_date');
        
        if (!$invoiceStartDate) {
            $this->error('Invoice start date (contribution_start_date) not set in settings. Please configure it first.');
            return 1;
        }
        
        $startDate = Carbon::parse($invoiceStartDate);
        $currentWeek = Carbon::now()->format('Y-\WW');
        $currentWeekStart = Carbon::now()->startOfWeek();
        
        // Only generate invoices if we're past the start date
        if ($currentWeekStart->lt($startDate)) {
            $this->info("Current week starts before invoice start date. Invoices will begin from {$startDate->format('M d, Y')}");
            return 0;
        }
        
        // Get active members
        $members = Member::where('is_active', true)->get();
        $activeCount = $members->count();
        $generated = 0;
        $skipped = 0;
        
        $dueDate = Carbon::now()->endOfWeek();
        $issueDate = Carbon::now()->startOfWeek();

        // If every active member already has this week's invoice, nothing to do
        if (!$this->option('force')) {
            $existing = Invoice::where('period', $currentWeek)
                ->where('invoice_type', Invoice::TYPE_WEEKLY)
                ->whereIn('member_id', $members->pluck('id'))
                ->count();
            if ($existing >= $activeCount && $activeCount > 0) {
                $this->info("Invoices already generated for week {$currentWeek} ({$existing}/{$activeCount} members). Use --force to regenerate.");
                return 0;
            }
        }
        
        foreach ($members as $member) {
            // All active members get invoices from the global start date
            // Skip if invoice already exists for this member and period
            if (!$this->option('force')) {
                $exists = Invoice::where('member_id', $member->id)
                    ->where('period', $currentWeek)
                    ->where('invoice_type', Invoice::TYPE_WEEKLY)
                    ->exists();
                if ($exists) {
                    $skipped++;
                    continue;
                }
            }
            
            Invoice::create([
                'member_id' => $member->id,
                'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_WEEKLY, $issueDate),
                'amount' => $weeklyAmount,
                'due_date' => $dueDate,
                'issue_date' => $issueDate,
                'status' => 'pending',
                'period' => $currentWeek,
                'invoice_type' => Invoice::TYPE_WEEKLY,
                'description' => "Weekly contribution for week {$currentWeek}",
            ]);
            
            $generated++;
        }
        
        $this->info("Week {$currentWeek}: generated {$generated}, skipped {$skipped} (already had invoice)");
        
        return 0;
    }
}
