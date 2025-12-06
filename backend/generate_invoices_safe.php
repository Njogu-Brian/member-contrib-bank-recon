<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Invoice;
use App\Models\InvoiceType;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

echo "=== Generating Invoices with Duplicate Check ===\n\n";

// 1. Software Acquisition Invoices on April 22, 2025
echo "1. SOFTWARE ACQUISITION INVOICES (April 22, 2025)\n";
echo "   Issue Date: 2025-04-22\n";
echo "   Based on: Member's date_of_registration\n\n";

$softwareType = InvoiceType::where('code', 'software_acquisition')->first();
if (!$softwareType) {
    echo "ERROR: software_acquisition invoice type not found!\n";
    exit(1);
}

$softwareIssueDate = Carbon::parse('2025-04-22');
$softwareDueDate = $softwareIssueDate->copy()->addDays($softwareType->due_days);

$allMembers = Member::where('is_active', true)->get();
$softwareGenerated = 0;
$softwareSkipped = 0;
$softwareErrors = [];

foreach ($allMembers as $member) {
    // Check if member already has software invoice on this date
    $exists = Invoice::where('member_id', $member->id)
        ->where(function($q) use ($softwareType) {
            $q->where('invoice_type_id', $softwareType->id)
              ->orWhere('invoice_type', 'software_acquisition');
        })
        ->whereDate('issue_date', $softwareIssueDate->format('Y-m-d'))
        ->exists();
    
    if ($exists) {
        $softwareSkipped++;
        continue;
    }
    
    // Use member's registration date
    $registrationDate = $member->date_of_registration 
        ? Carbon::parse($member->date_of_registration)
        : null;
    
    if (!$registrationDate) {
        $softwareSkipped++;
        $softwareErrors[] = "{$member->name}: No registration date";
        continue;
    }
    
    try {
        DB::beginTransaction();
        
        $invoice = Invoice::create([
            'member_id' => $member->id,
            'invoice_number' => Invoice::generateInvoiceNumber($softwareType->code, $softwareIssueDate),
            'amount' => $softwareType->default_amount,
            'issue_date' => $softwareIssueDate,
            'due_date' => $softwareDueDate,
            'status' => 'pending',
            'period' => 'SOFTWARE-2025',
            'invoice_type' => $softwareType->code,
            'invoice_type_id' => $softwareType->id,
            'description' => "Software acquisition fee (Member joined: {$registrationDate->format('M d, Y')})",
        ]);
        
        DB::commit();
        $softwareGenerated++;
        
        if ($softwareGenerated % 50 == 0) {
            echo "  Generated {$softwareGenerated} software invoices...\n";
        }
    } catch (\Exception $e) {
        DB::rollBack();
        $softwareErrors[] = "{$member->name}: " . $e->getMessage();
        $softwareSkipped++;
    }
}

echo "\n   Software Invoices:\n";
echo "   - Generated: {$softwareGenerated}\n";
echo "   - Skipped (already exists): {$softwareSkipped}\n";
if (!empty($softwareErrors)) {
    echo "   - Errors: " . count($softwareErrors) . "\n";
    foreach (array_slice($softwareErrors, 0, 5) as $error) {
        echo "     * {$error}\n";
    }
}

// 2. Annual Subscription for 2024 Members on Jan 1, 2025
echo "\n\n2. ANNUAL SUBSCRIPTION INVOICES (January 1, 2025)\n";
echo "   Issue Date: 2025-01-01\n";
echo "   For: Members who joined in 2024\n\n";

$annualType = InvoiceType::where('code', 'annual_subscription')->first();
if (!$annualType) {
    echo "ERROR: annual_subscription invoice type not found!\n";
    exit(1);
}

$annualIssueDate = Carbon::parse('2025-01-01');
$annualDueDate = $annualIssueDate->copy()->addDays($annualType->due_days);

$members2024 = Member::where('is_active', true)
    ->whereYear('date_of_registration', 2024)
    ->get();

$annualGenerated = 0;
$annualSkipped = 0;
$annualErrors = [];

foreach ($members2024 as $member) {
    // Check if member already has annual invoice for 2025
    $exists = Invoice::where('member_id', $member->id)
        ->where(function($q) use ($annualType) {
            $q->where('invoice_type_id', $annualType->id)
              ->orWhere('invoice_type', 'annual_subscription');
        })
        ->whereYear('issue_date', 2025)
        ->whereDate('issue_date', '<=', $annualIssueDate)
        ->exists();
    
    if ($exists) {
        $annualSkipped++;
        continue;
    }
    
    try {
        DB::beginTransaction();
        
        $invoice = Invoice::create([
            'member_id' => $member->id,
            'invoice_number' => Invoice::generateInvoiceNumber($annualType->code, $annualIssueDate),
            'amount' => $annualType->default_amount > 0 ? $annualType->default_amount : 1000,
            'issue_date' => $annualIssueDate,
            'due_date' => $annualDueDate,
            'status' => 'pending',
            'period' => 'YEAR-2025',
            'invoice_type' => $annualType->code,
            'invoice_type_id' => $annualType->id,
            'invoice_year' => 2025,
            'description' => "Annual subscription for 2025 (Member joined in 2024)",
        ]);
        
        DB::commit();
        $annualGenerated++;
    } catch (\Exception $e) {
        DB::rollBack();
        $annualErrors[] = "{$member->name}: " . $e->getMessage();
        $annualSkipped++;
    }
}

echo "\n   Annual Invoices:\n";
echo "   - Generated: {$annualGenerated}\n";
echo "   - Skipped (already exists): {$annualSkipped}\n";
echo "   - Total 2024 members: {$members2024->count()}\n";
if (!empty($annualErrors)) {
    echo "   - Errors: " . count($annualErrors) . "\n";
    foreach (array_slice($annualErrors, 0, 5) as $error) {
        echo "     * {$error}\n";
    }
}

// Final verification
echo "\n\n=== FINAL VERIFICATION ===\n";
$totalSoftware = Invoice::where(function($q) use ($softwareType) {
    $q->where('invoice_type_id', $softwareType->id)
      ->orWhere('invoice_type', 'software_acquisition');
})->whereDate('issue_date', '2025-04-22')->count();

$totalAnnual = Invoice::where(function($q) use ($annualType) {
    $q->where('invoice_type_id', $annualType->id)
      ->orWhere('invoice_type', 'annual_subscription');
})->whereDate('issue_date', '2025-01-01')->whereYear('issue_date', 2025)->count();

echo "Total software invoices on 2025-04-22: {$totalSoftware}\n";
echo "Total annual invoices on 2025-01-01: {$totalAnnual}\n";

// Check for duplicates
$duplicates = DB::select("
    SELECT member_id, invoice_type, issue_date, COUNT(*) as count
    FROM invoices
    WHERE (invoice_type = 'software_acquisition' AND DATE(issue_date) = '2025-04-22')
       OR (invoice_type = 'annual_subscription' AND DATE(issue_date) = '2025-01-01' AND YEAR(issue_date) = 2025)
    GROUP BY member_id, invoice_type, issue_date
    HAVING count > 1
");

if (empty($duplicates)) {
    echo "\n✅ NO DUPLICATES FOUND - All members have unique invoices\n";
} else {
    echo "\n⚠️  WARNING: Found " . count($duplicates) . " duplicate invoice groups:\n";
    foreach ($duplicates as $dup) {
        echo "   Member ID {$dup->member_id}: {$dup->count} {$dup->invoice_type} invoices on {$dup->issue_date}\n";
    }
}

echo "\n✅ Invoice generation complete!\n";

