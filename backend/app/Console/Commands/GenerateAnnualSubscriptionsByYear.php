<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\InvoiceType;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GenerateAnnualSubscriptionsByYear extends Command
{
    protected $signature = 'invoices:generate-annual-by-year 
                            {year : Year to charge (e.g., 2024). Charges members who joined in this year.}
                            {--type= : Invoice type code (default: annual_subscription)}
                            {--dry-run : Show what would be generated without creating}';
    protected $description = 'Generate annual subscription invoices for members who joined in a specific year. Use this to charge members who joined in a particular year for that year\'s annual fee.';

    public function handle()
    {
        $targetYear = (int) $this->argument('year');
        $invoiceTypeCode = $this->option('type') ?: 'annual_subscription';
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No invoices will be created');
        }

        $this->info("📅 Generating annual subscription invoices for members who joined in {$targetYear}...");

        // Get invoice type
        $invoiceType = InvoiceType::where('code', $invoiceTypeCode)->first();
        if (!$invoiceType) {
            $this->error("Invoice type '{$invoiceTypeCode}' not found.");
            $this->comment("Available invoice types:");
            $types = InvoiceType::all();
            foreach ($types as $type) {
                $this->line("  - {$type->code} ({$type->name})");
            }
            return 1;
        }
        
        $this->info("   Using invoice type: {$invoiceType->name} ({$invoiceType->code})");
        $this->info("   Amount: KES " . number_format($invoiceType->default_amount, 2));

        if ($invoiceType->charge_type !== InvoiceType::CHARGE_YEARLY) {
            $this->warn("Warning: Invoice type '{$invoiceTypeCode}' is not a yearly charge type.");
        }

        // Get members who joined in the target year
        $members = Member::where('is_active', true)
            ->whereYear('date_of_registration', $targetYear)
            ->get();

        $this->info("   Found {$members->count()} member(s) who joined in {$targetYear}");

        if ($members->isEmpty()) {
            $this->warn("   No members found for year {$targetYear}");
            return 0;
        }

        $generated = 0;
        $skipped = 0;
        $errors = [];

        foreach ($members as $member) {
            // Check if invoice already exists for this year
            $existingInvoice = Invoice::where('member_id', $member->id)
                ->where(function ($query) use ($invoiceType) {
                    $query->where('invoice_type_id', $invoiceType->id)
                          ->orWhere('invoice_type', $invoiceType->code);
                })
                ->whereYear('issue_date', $targetYear)
                ->first();

            if ($existingInvoice) {
                if ($isDryRun) {
                    $this->line("  Would skip: {$member->name} - Invoice already exists for {$targetYear} (Invoice #{$existingInvoice->invoice_number})");
                }
                $skipped++;
                continue;
            }

            if ($isDryRun) {
                $registrationDate = $member->date_of_registration 
                    ? \Carbon\Carbon::parse($member->date_of_registration)->format('M d, Y')
                    : 'N/A';
                $issueDate = $member->date_of_registration && \Carbon\Carbon::parse($member->date_of_registration)->year == $targetYear
                    ? \Carbon\Carbon::parse($member->date_of_registration)->format('M d, Y')
                    : "Jan 1, {$targetYear}";
                $this->line("  ✓ Would create: {$member->name}");
                $this->line("    Issue Date: {$issueDate} | Joined: {$registrationDate} | Amount: KES " . number_format($invoiceType->default_amount, 2));
                $generated++;
                continue;
            }

            try {
                DB::beginTransaction();

                // Calculate issue date based on registration date and target year
                $registrationDate = Carbon::parse($member->date_of_registration);
                
                // For annual subscriptions, charge on the anniversary of registration
                // If member joined in targetYear, charge on their registration date
                // If member joined before targetYear, charge on Jan 1 of targetYear
                if ($registrationDate->year == $targetYear) {
                    // Member joined in target year - charge on their registration date
                    $issueDate = $registrationDate->copy();
                } else {
                    // Member joined before target year - charge on Jan 1 of target year
                    $issueDate = Carbon::create($targetYear, 1, 1);
                }

                $dueDate = $issueDate->copy()->addDays($invoiceType->due_days);

                $invoice = Invoice::create([
                    'member_id' => $member->id,
                    'invoice_number' => Invoice::generateInvoiceNumber($invoiceType->code, $issueDate),
                    'amount' => $invoiceType->default_amount,
                    'issue_date' => $issueDate,
                    'due_date' => $dueDate,
                    'status' => 'pending',
                    'period' => "YEAR-{$targetYear}",
                    'invoice_type' => $invoiceType->code,
                    'invoice_type_id' => $invoiceType->id,
                    'invoice_year' => $targetYear,
                    'description' => $invoiceType->description ?? "Annual subscription for {$targetYear}",
                ]);

                DB::commit();
                $generated++;

                if ($generated % 50 == 0) {
                    $this->info("  Generated {$generated} invoices...");
                }
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Error generating annual invoice for member {$member->id}: " . $e->getMessage());
                $errors[] = "{$member->name}: " . $e->getMessage();
                $skipped++;
            }
        }

        $this->newLine();
        $this->info('✅ COMPLETE!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Generated', $generated],
                ['Skipped', $skipped],
                ['Total Members', $members->count()],
            ]
        );

        if ($generated > 0) {
            $this->info("\n✅ Successfully generated {$generated} annual subscription invoice(s) for {$targetYear}");
        }
        if ($skipped > 0) {
            $this->warn("⚠️  Skipped {$skipped} member(s) (already have invoice for {$targetYear})");
        }
        if ($generated === 0 && $skipped > 0 && !$isDryRun) {
            $this->comment("\n💡 Tip: All members already have invoices for {$targetYear}. Use --dry-run to see details.");
        }
        if ($generated === 0 && $skipped > 0 && !$isDryRun) {
            $this->comment("\n💡 Tip: All members already have invoices for {$targetYear}. Use --dry-run to see details.");
        }
        if (!empty($errors) && !$isDryRun) {
            $this->warn("\n  Errors encountered:");
            foreach (array_slice($errors, 0, 10) as $error) {
                $this->warn("    - {$error}");
            }
            if (count($errors) > 10) {
                $this->warn("    ... and " . (count($errors) - 10) . " more");
            }
        }

        return 0;
    }
}

