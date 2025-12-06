<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Invoice;
use App\Models\Member;
use Illuminate\Support\Facades\DB;

echo "=== INVESTIGATING IAN'S INVOICE ISSUE ===\n\n";

// Check who has the invoice numbers that caused the error
echo "1. Checking Invoice Numbers That Caused Errors:\n\n";

$sftInvoice = Invoice::where('invoice_number', 'SFT-20250422-0001')->first();
if ($sftInvoice) {
    $member = $sftInvoice->member;
    echo "SFT-20250422-0001:\n";
    echo "  - Invoice ID: {$sftInvoice->id}\n";
    echo "  - Member: " . ($member ? $member->name : 'Unknown') . " (ID: {$sftInvoice->member_id})\n";
    echo "  - Issue Date: {$sftInvoice->issue_date}\n";
    echo "  - Created: {$sftInvoice->created_at}\n\n";
} else {
    echo "SFT-20250422-0001: NOT FOUND\n\n";
}

$subInvoice = Invoice::where('invoice_number', 'SUB-20250101-0001')->first();
if ($subInvoice) {
    $member = $subInvoice->member;
    echo "SUB-20250101-0001:\n";
    echo "  - Invoice ID: {$subInvoice->id}\n";
    echo "  - Member: " . ($member ? $member->name : 'Unknown') . " (ID: {$subInvoice->member_id})\n";
    echo "  - Issue Date: {$subInvoice->issue_date}\n";
    echo "  - Created: {$subInvoice->created_at}\n\n";
} else {
    echo "SUB-20250101-0001: NOT FOUND\n\n";
}

// Check Ian's invoices again
echo "2. Ian's Current Invoices:\n\n";
$ian = Member::find(98);
if ($ian) {
    // Check for software invoices (any date)
    $ianSoftware = Invoice::where('member_id', 98)
        ->where(function($q) {
            $q->where('invoice_type', 'software_acquisition')
              ->orWhere('invoice_type', 'SOFTWARE')
              ->orWhere('invoice_type_id', 4); // software_acquisition type ID
        })
        ->get();
    
    echo "Software Invoices (any date): {$ianSoftware->count()}\n";
    foreach ($ianSoftware as $inv) {
        echo "  - Invoice #{$inv->invoice_number} - {$inv->issue_date} (ID: {$inv->id})\n";
    }
    
    // Check for annual invoices (any date)
    $ianAnnual = Invoice::where('member_id', 98)
        ->where(function($q) {
            $q->where('invoice_type', 'annual_subscription')
              ->orWhere('invoice_type', 'SUBSCRIPTION')
              ->orWhere('invoice_type_id', 3); // annual_subscription type ID
        })
        ->get();
    
    echo "\nAnnual Invoices (any date): {$ianAnnual->count()}\n";
    foreach ($ianAnnual as $inv) {
        echo "  - Invoice #{$inv->invoice_number} - {$inv->issue_date} (ID: {$inv->id})\n";
    }
}

// Check invoice number generation logic
echo "\n\n3. Invoice Number Generation Check:\n\n";
$sftCount = Invoice::where('invoice_number', 'LIKE', 'SFT-20250422-%')->count();
$subCount = Invoice::where('invoice_number', 'LIKE', 'SUB-20250101-%')->count();

echo "Total SFT invoices on 2025-04-22: {$sftCount}\n";
echo "Total SUB invoices on 2025-01-01: {$subCount}\n";

// Find the highest invoice numbers
$maxSft = DB::select("SELECT MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)) as max_num FROM invoices WHERE invoice_number LIKE 'SFT-20250422-%'");
$maxSub = DB::select("SELECT MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)) as max_num FROM invoices WHERE invoice_number LIKE 'SUB-20250101-%'");

echo "Highest SFT number: " . ($maxSft[0]->max_num ?? 'N/A') . "\n";
echo "Highest SUB number: " . ($maxSub[0]->max_num ?? 'N/A') . "\n";

// Check if Ian should have these invoices
echo "\n\n4. Should Ian Have These Invoices?\n\n";
$ian = Member::find(98);
if ($ian) {
    echo "Ian's Registration Date: " . ($ian->date_of_registration ? $ian->date_of_registration : 'N/A') . "\n";
    echo "Ian Joined in 2024: " . ($ian->date_of_registration && date('Y', strtotime($ian->date_of_registration)) == 2024 ? 'Yes' : 'No') . "\n";
    
    // Check if Ian should have software invoice
    $shouldHaveSoftware = $ian->date_of_registration ? true : false;
    echo "Should have software invoice: " . ($shouldHaveSoftware ? 'Yes' : 'No') . "\n";
    
    // Check if Ian should have annual invoice
    $shouldHaveAnnual = $ian->date_of_registration && date('Y', strtotime($ian->date_of_registration)) == 2024;
    echo "Should have annual invoice (2024 member): " . ($shouldHaveAnnual ? 'Yes' : 'No') . "\n";
}

echo "\n✅ Investigation complete!\n";

