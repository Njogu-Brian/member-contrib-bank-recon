<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateRegistrationFees extends Command
{
    protected $signature = 'invoices:generate-registration-fees {--dry-run : Show what would be generated without creating}';
    protected $description = 'Generate one-time registration fee invoices for all members';

    public function handle()
    {
        $amount = 1000; // KES 1,000 registration fee
        $isDryRun = $this->option('dry-run');
        
        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No invoices will be created');
        }
        
        $this->info('💰 Generating registration fee invoices (KES ' . number_format($amount, 2) . ')...');
        
        // Get all members
        $members = Member::all();
        
        $generated = 0;
        $skipped = 0;
        
        foreach ($members as $member) {
            // Check if registration fee invoice already exists
            $exists = Invoice::where('member_id', $member->id)
                ->where('invoice_type', Invoice::TYPE_REGISTRATION)
                ->exists();
            
            if ($exists) {
                $skipped++;
                continue;
            }
            
            // Use first contribution date as registration date
            $registrationDate = $this->getFirstContributionDate($member);
            
            if (!$registrationDate) {
                $this->warn("  Skipping {$member->name} - No contribution date found");
                $skipped++;
                continue;
            }
            
            if ($isDryRun) {
                $this->line("  Would create: {$member->name} - " . $registrationDate->format('M d, Y'));
                $generated++;
                continue;
            }
            
            // Create registration fee invoice
            $invoice = Invoice::create([
                'member_id' => $member->id,
                'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_REGISTRATION, $registrationDate),
                'amount' => $amount,
                'issue_date' => $registrationDate,
                'due_date' => $registrationDate->copy()->addDays(30),
                'status' => 'pending',
                'period' => 'REG-' . $registrationDate->format('Y'),
                'invoice_type' => Invoice::TYPE_REGISTRATION,
                'description' => 'One-time registration fee',
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
                ['Total Members', $members->count()],
            ]
        );
        
        return 0;
    }
    
    /**
     * Get member's first contribution date
     */
    private function getFirstContributionDate(Member $member): ?Carbon
    {
        // Check transactions
        $firstTransaction = $member->transactions()
            ->where('assignment_status', '!=', 'duplicate')
            ->where('credit', '>', 0)
            ->orderBy('tran_date')
            ->first();
        
        // Check manual contributions
        $firstManual = $member->manualContributions()
            ->orderBy('contribution_date')
            ->first();
        
        $dates = array_filter([
            $firstTransaction?->tran_date,
            $firstManual?->contribution_date,
            $member->date_of_registration,
        ]);
        
        if (empty($dates)) {
            return null;
        }
        
        return collect($dates)->sort()->first();
    }
}
