<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateSoftwareAcquisition extends Command
{
    protected $signature = 'invoices:generate-software-acquisition 
                            {--date=2025-04-22 : Date to charge (Y-m-d format)}
                            {--dry-run : Show what would be generated without creating}';
    protected $description = 'Generate one-time software acquisition invoices for all members';

    public function handle()
    {
        $amount = 2000; // KES 2,000 software acquisition cost
        $isDryRun = $this->option('dry-run');
        $chargeDate = Carbon::parse($this->option('date'));
        $dueDate = $chargeDate->copy()->addMonth(); // Due: 30 days later
        
        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No invoices will be created');
        }
        
        $this->info('💻 Generating software acquisition invoices');
        $this->info("   Charge Date: {$chargeDate->format('M d, Y')}");
        $this->info("   Due Date: {$dueDate->format('M d, Y')}");
        $this->info("   Amount: KES " . number_format($amount, 2));
        
        // Get all members who were active as of the charge date
        $members = Member::where('is_active', true)
            ->where(function ($query) use ($chargeDate) {
                // Members created before or on charge date
                $query->whereDate('created_at', '<=', $chargeDate)
                    // Or members with contributions before or on charge date
                    ->orWhereHas('transactions', function ($q) use ($chargeDate) {
                        $q->whereDate('tran_date', '<=', $chargeDate);
                    });
            })
            ->get();
        
        $this->info("   Found {$members->count()} eligible members");
        
        $generated = 0;
        $skipped = 0;
        
        foreach ($members as $member) {
            // Check if software acquisition invoice already exists
            $exists = Invoice::where('member_id', $member->id)
                ->where('invoice_type', Invoice::TYPE_SOFTWARE)
                ->exists();
            
            if ($exists) {
                $skipped++;
                continue;
            }
            
            if ($isDryRun) {
                $this->line("  Would create: {$member->name} - Software Acquisition");
                $generated++;
                continue;
            }
            
            // Create software acquisition invoice
            Invoice::create([
                'member_id' => $member->id,
                'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_SOFTWARE, $chargeDate),
                'amount' => $amount,
                'issue_date' => $chargeDate,
                'due_date' => $dueDate,
                'status' => 'pending',
                'period' => 'SOFTWARE-2025',
                'invoice_type' => Invoice::TYPE_SOFTWARE,
                'description' => 'Software development & acquisition cost',
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
        
        if (!$isDryRun && $generated > 0) {
            $this->info('💡 Total software acquisition fees: KES ' . number_format($generated * $amount, 2));
        }
        
        return 0;
    }
}
