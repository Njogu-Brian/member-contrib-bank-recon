<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Member;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AdjustInvoicesToStartDate extends Command
{
    protected $signature = 'invoices:adjust-to-start-date {--dry-run : Show what would be done without making changes}';
    protected $description = 'Adjust weekly invoices to match the contribution start date setting';

    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        
        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No changes will be made');
        }
        
        $this->info('🔄 Adjusting weekly invoices to match start date...');
        
        // Get start date from settings
        $startDate = Carbon::parse(Setting::get('contribution_start_date'));
        $this->info("   Contribution Start Date: {$startDate->format('M d, Y')}");
        
        // Step 1: Find and delete weekly invoices before start date
        $beforeCount = Invoice::where('invoice_type', Invoice::TYPE_WEEKLY)
            ->whereDate('issue_date', '<', $startDate)
            ->count();
        
        if ($beforeCount > 0) {
            $this->warn("   Found {$beforeCount} weekly invoices BEFORE start date");
            
            if (!$isDryRun) {
                Invoice::where('invoice_type', Invoice::TYPE_WEEKLY)
                    ->whereDate('issue_date', '<', $startDate)
                    ->delete();
                $this->info("   ✅ Deleted {$beforeCount} invoices");
            } else {
                $this->line("   Would delete {$beforeCount} invoices");
            }
        } else {
            $this->info("   ✅ No invoices found before start date");
        }
        
        // Step 2: Find missing weeks between start date and now
        $currentWeek = $startDate->copy()->startOfWeek();
        $endWeek = Carbon::now()->startOfWeek();
        
        $missingWeeks = [];
        $tempWeek = $currentWeek->copy();
        
        while ($tempWeek->lte($endWeek)) {
            $period = $tempWeek->format('Y-\WW');
            
            // Check if this week has invoices
            $existingCount = Invoice::where('period', $period)
                ->where('invoice_type', Invoice::TYPE_WEEKLY)
                ->count();
            
            $activeMembers = Member::where('is_active', true)->count();
            
            if ($existingCount < $activeMembers) {
                $missingWeeks[] = [
                    'period' => $period,
                    'date' => $tempWeek->copy(),
                    'missing' => $activeMembers - $existingCount,
                ];
            }
            
            $tempWeek->addWeek();
        }
        
        if (count($missingWeeks) > 0) {
            $this->warn("   Found " . count($missingWeeks) . " weeks with missing invoices");
            
            $totalToGenerate = 0;
            foreach ($missingWeeks as $week) {
                $totalToGenerate += $week['missing'];
            }
            
            if (!$isDryRun) {
                $this->info("   Generating {$totalToGenerate} missing weekly invoices...");
                
                $weeklyAmount = (float) Setting::get('weekly_contribution_amount', 1000);
                $generated = 0;
                
                foreach ($missingWeeks as $weekData) {
                    $weekStart = $weekData['date'];
                    $weekEnd = $weekData['date']->copy()->endOfWeek();
                    $period = $weekData['period'];
                    
                    $allMembers = Member::where('is_active', true)->get();
                    
                    foreach ($allMembers as $member) {
                        // Check if invoice exists
                        $exists = Invoice::where('member_id', $member->id)
                            ->where('period', $period)
                            ->where('invoice_type', Invoice::TYPE_WEEKLY)
                            ->exists();
                        
                        if (!$exists) {
                            Invoice::create([
                                'member_id' => $member->id,
                                'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_WEEKLY, $weekStart),
                                'amount' => $weeklyAmount,
                                'issue_date' => $weekStart,
                                'due_date' => $weekEnd,
                                'status' => 'pending',
                                'period' => $period,
                                'invoice_type' => Invoice::TYPE_WEEKLY,
                                'description' => 'Weekly contribution for ' . $weekStart->format('M d, Y'),
                            ]);
                            
                            $generated++;
                        }
                    }
                }
                
                $this->info("   ✅ Generated {$generated} invoices");
            } else {
                $this->line("   Would generate {$totalToGenerate} invoices");
                foreach ($missingWeeks as $week) {
                    $this->line("     Week {$week['period']}: {$week['missing']} invoices");
                }
            }
        } else {
            $this->info("   ✅ All weeks have complete invoices");
        }
        
        // Step 3: Summary
        $this->newLine();
        $this->info('📊 Current Invoice Status:');
        $totalWeekly = Invoice::where('invoice_type', Invoice::TYPE_WEEKLY)->count();
        $earliestWeekly = Invoice::where('invoice_type', Invoice::TYPE_WEEKLY)
            ->orderBy('issue_date')
            ->first();
        
        $this->table(
            ['Metric', 'Value'],
            [
                ['Start Date', $startDate->format('M d, Y')],
                ['Total Weekly Invoices', $totalWeekly],
                ['Earliest Invoice', $earliestWeekly ? $earliestWeekly->issue_date->format('M d, Y') : 'None'],
                ['Active Members', Member::where('is_active', true)->count()],
            ]
        );
        
        return 0;
    }
}
