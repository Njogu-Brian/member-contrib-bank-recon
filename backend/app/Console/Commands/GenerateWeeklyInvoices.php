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
        $currentWeek = Carbon::now()->format('Y-\WW');
        
        // Check if invoices already generated for this week
        if (!$this->option('force')) {
            $existing = Invoice::where('period', $currentWeek)->count();
            if ($existing > 0) {
                $this->info("Invoices already generated for week {$currentWeek}. Use --force to regenerate.");
                return 0;
            }
        }
        
        $members = Member::where('is_active', true)->get();
        $generated = 0;
        
        $dueDate = Carbon::now()->endOfWeek();
        $issueDate = Carbon::now()->startOfWeek();
        
        foreach ($members as $member) {
            // Skip if invoice already exists for this member and period
            if (!$this->option('force')) {
                $exists = Invoice::where('member_id', $member->id)
                    ->where('period', $currentWeek)
                    ->exists();
                if ($exists) {
                    continue;
                }
            }
            
            Invoice::create([
                'member_id' => $member->id,
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'amount' => $weeklyAmount,
                'due_date' => $dueDate,
                'issue_date' => $issueDate,
                'status' => 'pending',
                'period' => $currentWeek,
                'description' => "Weekly contribution for week {$currentWeek}",
            ]);
            
            $generated++;
        }
        
        $this->info("Generated {$generated} invoices for week {$currentWeek}");
        
        return 0;
    }
}
