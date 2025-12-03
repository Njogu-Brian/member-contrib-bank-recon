<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Member;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillHistoricalInvoices extends Command
{
    protected $signature = 'invoices:backfill {--from= : Start date (Y-m-d)} {--to= : End date (Y-m-d)} {--dry-run : Show what would be generated without creating}';
    protected $description = 'Generate historical invoices for all weeks from start date to now';

    public function handle()
    {
        $weeklyAmount = (float) Setting::get('weekly_contribution_amount', 1000);
        
        // Get date range
        $fromDate = $this->option('from') 
            ? Carbon::parse($this->option('from'))
            : Carbon::parse(Setting::get('contribution_start_date'));
        
        $toDate = $this->option('to')
            ? Carbon::parse($this->option('to'))
            : Carbon::now();
        
        if (!$fromDate) {
            $this->error('Invoice start date (contribution_start_date) not set in settings. Please configure it first.');
            return 1;
        }

        $this->info("Backfilling invoices from {$fromDate->format('M d, Y')} to {$toDate->format('M d, Y')}");
        
        // Get all weeks in the range
        $currentWeek = $fromDate->copy()->startOfWeek();
        $endWeek = $toDate->copy()->startOfWeek();
        $weeks = [];
        
        while ($currentWeek->lte($endWeek)) {
            $weeks[] = [
                'period' => $currentWeek->format('Y-\WW'),
                'start' => $currentWeek->copy(),
                'end' => $currentWeek->copy()->endOfWeek(),
            ];
            $currentWeek->addWeek();
        }
        
        $this->info("Found " . count($weeks) . " weeks to process");
        
        $totalGenerated = 0;
        $totalSkipped = 0;
        
        // Get all members (we'll filter per week)
        $allMembers = Member::all();
        
        foreach ($weeks as $weekData) {
            $weekPeriod = $weekData['period'];
            $weekStart = $weekData['start'];
            $weekEnd = $weekData['end'];
            
            if ($this->option('dry-run')) {
                $this->line("Week {$weekPeriod} ({$weekStart->format('M d')} - {$weekEnd->format('M d, Y')})");
            }
            
            // All active members get invoices from the global start date
            // regardless of when they individually joined
            $eligibleMembers = $allMembers->where('is_active', true);
            
            $weekGenerated = 0;
            
            foreach ($eligibleMembers as $member) {
                // Check if invoice already exists
                $exists = Invoice::where('member_id', $member->id)
                    ->where('period', $weekPeriod)
                    ->exists();
                
                if ($exists) {
                    $totalSkipped++;
                    continue;
                }
                
                if ($this->option('dry-run')) {
                    $this->line("  Would create invoice for: {$member->name}");
                    $weekGenerated++;
                    continue;
                }
                
                // Generate invoice number based on week start date, not today
                $prefix = 'INV';
                $dateStr = $weekStart->format('Ymd');
                $sequence = Invoice::whereDate('issue_date', $weekStart->toDateString())
                    ->count() + 1;
                $invoiceNumber = sprintf('%s-%s-%04d', $prefix, $dateStr, $sequence);
                
                // Create the invoice
                Invoice::create([
                    'member_id' => $member->id,
                    'invoice_number' => $invoiceNumber,
                    'amount' => $weeklyAmount,
                    'due_date' => $weekEnd,
                    'issue_date' => $weekStart,
                    'status' => 'pending',
                    'period' => $weekPeriod,
                    'description' => "Weekly contribution for week {$weekPeriod}",
                ]);
                
                $weekGenerated++;
                $totalGenerated++;
            }
            
            if (!$this->option('dry-run')) {
                $this->info("Week {$weekPeriod}: Generated {$weekGenerated} invoices");
            } else {
                $this->line("  Total for week: {$weekGenerated} invoices");
            }
        }
        
        if ($this->option('dry-run')) {
            $this->info("\nDRY RUN COMPLETE");
            $this->info("Would generate: {$totalGenerated} new invoices");
            $this->info("Would skip: {$totalSkipped} existing invoices");
            $this->info("\nRun without --dry-run to actually create invoices");
        } else {
            $this->info("\nBACKFILL COMPLETE");
            $this->info("Generated: {$totalGenerated} new invoices");
            $this->info("Skipped: {$totalSkipped} existing invoices");
        }
        
        return 0;
    }
}
