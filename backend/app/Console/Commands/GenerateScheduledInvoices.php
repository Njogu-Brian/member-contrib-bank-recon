<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\InvoiceType;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GenerateScheduledInvoices extends Command
{
    protected $signature = 'invoices:generate-scheduled 
                            {--type= : Specific invoice type code to generate}
                            {--year= : For yearly charges, only charge members who joined in this year}
                            {--dry-run : Show what would be generated without creating}';
    protected $description = 'Generate invoices based on invoice type schedules';

    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        $specificType = $this->option('type');

        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No invoices will be created');
        }

        $this->info('📅 Generating scheduled invoices...');

        // Get active invoice types
        $query = InvoiceType::where('is_active', true)
            ->where('charge_type', '!=', InvoiceType::CHARGE_CUSTOM)
            ->where('charge_type', '!=', InvoiceType::CHARGE_WEEKLY); // Weekly handled by separate command

        if ($specificType) {
            $query->where('code', $specificType);
        }

        $invoiceTypes = $query->orderBy('sort_order')->get();

        if ($invoiceTypes->isEmpty()) {
            $this->warn('No active invoice types found to process.');
            return 0;
        }

        $totalGenerated = 0;
        $totalSkipped = 0;

        foreach ($invoiceTypes as $invoiceType) {
            $this->info("\n📋 Processing: {$invoiceType->name} ({$invoiceType->code})");
            $this->info("   Charge Type: {$invoiceType->charge_type}");

            $result = $this->processInvoiceType($invoiceType, $isDryRun);
            $totalGenerated += $result['generated'];
            $totalSkipped += $result['skipped'];
        }

        $this->newLine();
        $this->info('✅ COMPLETE!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Generated', $totalGenerated],
                ['Total Skipped', $totalSkipped],
            ]
        );

        if ($totalGenerated > 0) {
            $this->info("\n✅ Successfully generated {$totalGenerated} invoice(s)");
        }
        if ($totalSkipped > 0) {
            $this->warn("⚠️  Skipped {$totalSkipped} member(s) (already charged or not eligible)");
        }

        return 0;
    }

    protected function processInvoiceType(InvoiceType $invoiceType, bool $isDryRun): array
    {
        $generated = 0;
        $skipped = 0;
        $errors = [];

        // Get all active members
        $membersQuery = Member::where('is_active', true);
        
        // For yearly charges, optionally filter by registration year
        if ($invoiceType->charge_type === InvoiceType::CHARGE_YEARLY) {
            $targetYear = $this->option('year');
            if ($targetYear) {
                // Charge only members who joined in the specified year
                $membersQuery->whereYear('date_of_registration', $targetYear);
                $this->info("   Filtering by registration year: {$targetYear}");
            }
        }
        
        $members = $membersQuery->get();

        foreach ($members as $member) {
            if (!$invoiceType->shouldChargeForMember($member)) {
                continue;
            }

            // Check if invoice already exists (prevent duplicates)
            $exists = Invoice::where('member_id', $member->id)
                ->where(function ($query) use ($invoiceType) {
                    $query->where('invoice_type_id', $invoiceType->id)
                          ->orWhere('invoice_type', $invoiceType->code);
                })
                ->where(function ($query) use ($invoiceType, $member) {
                    // For "once" type, check if ANY invoice exists (should only be one)
                    if ($invoiceType->charge_type === InvoiceType::CHARGE_ONCE || 
                        $invoiceType->charge_type === InvoiceType::CHARGE_AFTER_JOINING) {
                        // Just check if any invoice of this type exists
                        return; // No additional date filtering needed
                    }
                    
                    // For recurring types, check if invoice exists for current period
                    if (in_array($invoiceType->charge_type, [InvoiceType::CHARGE_YEARLY, InvoiceType::CHARGE_MONTHLY])) {
                        $issueDate = $invoiceType->getIssueDateForMember($member);
                        $query->whereYear('issue_date', $issueDate->year);
                        if ($invoiceType->charge_type === InvoiceType::CHARGE_MONTHLY) {
                            $query->whereMonth('issue_date', $issueDate->month);
                        }
                    }
                })
                ->exists();

            if ($exists) {
                if ($invoiceType->charge_type === InvoiceType::CHARGE_ONCE || 
                    $invoiceType->charge_type === InvoiceType::CHARGE_AFTER_JOINING) {
                    $errors[] = "{$member->name}: Invoice already issued (one-time type)";
                }
                $skipped++;
                continue;
            }

            if ($isDryRun) {
                $issueDate = $invoiceType->getIssueDateForMember($member);
                $this->line("  Would create: {$member->name} - {$issueDate->format('M d, Y')}");
                $generated++;
                continue;
            }

            try {
                DB::beginTransaction();

                $issueDate = $invoiceType->getIssueDateForMember($member);
                $dueDate = $issueDate->copy()->addDays($invoiceType->due_days);

                $invoice = Invoice::create([
                    'member_id' => $member->id,
                    'invoice_number' => Invoice::generateInvoiceNumber($invoiceType->code, $issueDate),
                    'amount' => $invoiceType->default_amount,
                    'issue_date' => $issueDate,
                    'due_date' => $dueDate,
                    'status' => 'pending',
                    'period' => $this->generatePeriod($invoiceType, $issueDate),
                    'invoice_type' => $invoiceType->code,
                    'invoice_type_id' => $invoiceType->id,
                    'invoice_year' => $invoiceType->charge_type === InvoiceType::CHARGE_YEARLY ? $issueDate->year : null,
                    'description' => $invoiceType->description ?? $invoiceType->name,
                ]);

                DB::commit();
                $generated++;

                if ($generated % 50 == 0) {
                    $this->info("  Generated {$generated} invoices...");
                }
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Error generating invoice for member {$member->id}: " . $e->getMessage());
                $errors[] = "{$member->name}: " . $e->getMessage();
                $skipped++;
            }
        }

        if (!empty($errors) && !$isDryRun) {
            $this->warn("\n  Errors encountered:");
            foreach ($errors as $error) {
                $this->warn("    - {$error}");
            }
        }

        return ['generated' => $generated, 'skipped' => $skipped, 'errors' => $errors];
    }

    protected function generatePeriod(InvoiceType $invoiceType, Carbon $issueDate): string
    {
        switch ($invoiceType->charge_type) {
            case InvoiceType::CHARGE_YEARLY:
                return "YEAR-{$issueDate->year}";
            case InvoiceType::CHARGE_MONTHLY:
                return $issueDate->format('Y-m');
            case InvoiceType::CHARGE_AFTER_JOINING:
                return "REG-{$issueDate->format('Y')}";
            case InvoiceType::CHARGE_ONCE:
                return "ONCE-{$issueDate->format('Y')}";
            default:
                return $issueDate->format('Y-m-d');
        }
    }
}

