<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateAnnualSubscriptions extends Command
{
    protected $signature = 'invoices:generate-annual-subscriptions 
                            {--year= : Year to generate subscriptions for (e.g., 2026). Charges members who joined in the previous year.}
                            {--dry-run : Show what would be generated without creating}';
    protected $description = 'Generate annual subscription invoices for members who joined in the previous year. For example, if year=2025, charges members who joined in 2024.';

    public function handle()
    {
        $amount = 1000; // KES 1,000 annual subscription
        $isDryRun = $this->option('dry-run');
        $year = $this->option('year') ?? now()->year;
        
        $issueDate = Carbon::create($year, 1, 1); // January 1st
        $dueDate = $issueDate->copy()->addMonth(); // Due: February 1st
        
        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No invoices will be created');
        }
        
        $this->info("📅 Generating annual subscription invoices for year {$year}");
        $this->info("   Issue Date: {$issueDate->format('M d, Y')}");
        $this->info("   Due Date: {$dueDate->format('M d, Y')}");
        $this->info("   Amount: KES " . number_format($amount, 2));
        
        // Get members who joined in the previous year (for annual subscription)
        // This charges members who joined last year for this year's subscription
        $previousYear = $year - 1;
        $members = Member::where('is_active', true)
            ->where(function ($query) use ($previousYear) {
                // Members with registration date in previous year
                $query->whereYear('date_of_registration', $previousYear)
                    // Or members created in previous year (fallback)
                    ->orWhereYear('created_at', $previousYear)
                    // Or members with first contribution in previous year
                    ->orWhereHas('transactions', function ($q) use ($previousYear) {
                        $q->whereYear('tran_date', $previousYear)
                          ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
                          ->where('is_archived', false);
                    });
            })
            ->get();
        
        $this->info("   Found {$members->count()} eligible members (joined before {$year})");
        
        $generated = 0;
        $skipped = 0;
        
        foreach ($members as $member) {
            // Check if annual subscription for this year already exists
            $exists = Invoice::where('member_id', $member->id)
                ->where('invoice_type', Invoice::TYPE_ANNUAL)
                ->where('invoice_year', $year)
                ->exists();
            
            if ($exists) {
                $skipped++;
                continue;
            }
            
            if ($isDryRun) {
                $this->line("  Would create: {$member->name} - Subscription {$year}");
                $generated++;
                continue;
            }
            
            // Create annual subscription invoice
            Invoice::create([
                'member_id' => $member->id,
                'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_ANNUAL, $issueDate),
                'amount' => $amount,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'status' => 'pending',
                'period' => 'ANNUAL-' . $year,
                'invoice_type' => Invoice::TYPE_ANNUAL,
                'invoice_year' => $year,
                'description' => "Annual subscription for {$year}",
            ]);
            
            $generated++;
            
            if ($generated % 50 == 0) {
                $this->info("  Generated {$generated} invoices...");
            }
        }
        
        $this->newLine();
        $this->info('✅ COMPLETE!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Generated', $generated],
                ['Skipped (already exists)', $skipped],
                ['Eligible Members', $members->count()],
            ]
        );
        
        return 0;
    }
}
