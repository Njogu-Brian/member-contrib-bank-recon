<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Invoice;
use App\Models\InvoiceType;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

echo "=== DETAILED INVOICE REPORT ===\n\n";

// Check Ian specifically
echo "=== IAN MUCHICHU (Member ID 98) ===\n";
$ian = Member::find(98);
if ($ian) {
    echo "Name: {$ian->name}\n";
    echo "Registration Date: " . ($ian->date_of_registration ? Carbon::parse($ian->date_of_registration)->format('Y-m-d') : 'N/A') . "\n";
    echo "Is Active: " . ($ian->is_active ? 'Yes' : 'No') . "\n\n";
    
    // Check all invoices for Ian
    $ianInvoices = Invoice::where('member_id', 98)->get();
    echo "Total Invoices: {$ianInvoices->count()}\n\n";
    
    echo "All Invoices for Ian:\n";
    foreach ($ianInvoices as $inv) {
        echo "  - Invoice #{$inv->invoice_number}\n";
        echo "    Type: {$inv->invoice_type}\n";
        echo "    Issue Date: {$inv->issue_date}\n";
        echo "    Amount: KES " . number_format($inv->amount, 2) . "\n";
        echo "    Status: {$inv->status}\n";
        echo "    Created: {$inv->created_at}\n\n";
    }
    
    // Check for software invoices on 2025-04-22
    $ianSoftware = Invoice::where('member_id', 98)
        ->where(function($q) {
            $q->where('invoice_type', 'software_acquisition')
              ->orWhere('invoice_type', 'SOFTWARE');
        })
        ->whereDate('issue_date', '2025-04-22')
        ->get();
    
    echo "Software Invoices on 2025-04-22: {$ianSoftware->count()}\n";
    foreach ($ianSoftware as $inv) {
        echo "  - Invoice #{$inv->invoice_number} (ID: {$inv->id})\n";
    }
    
    // Check for annual invoices on 2025-01-01
    $ianAnnual = Invoice::where('member_id', 98)
        ->where(function($q) {
            $q->where('invoice_type', 'annual_subscription')
              ->orWhere('invoice_type', 'SUBSCRIPTION');
        })
        ->whereDate('issue_date', '2025-01-01')
        ->get();
    
    echo "\nAnnual Invoices on 2025-01-01: {$ianAnnual->count()}\n";
    foreach ($ianAnnual as $inv) {
        echo "  - Invoice #{$inv->invoice_number} (ID: {$inv->id})\n";
    }
    
    // Check for duplicate invoice numbers
    $duplicateNumbers = DB::select("
        SELECT invoice_number, COUNT(*) as count
        FROM invoices
        WHERE invoice_number IN (
            SELECT invoice_number FROM invoices WHERE member_id = 98
        )
        GROUP BY invoice_number
        HAVING count > 1
    ");
    
    if (!empty($duplicateNumbers)) {
        echo "\n⚠️  DUPLICATE INVOICE NUMBERS FOUND:\n";
        foreach ($duplicateNumbers as $dup) {
            $invs = Invoice::where('invoice_number', $dup->invoice_number)->get();
            echo "  Invoice #{$dup->invoice_number} appears {$dup->count} times:\n";
            foreach ($invs as $inv) {
                echo "    - Member ID: {$inv->member_id}, Invoice ID: {$inv->id}, Created: {$inv->created_at}\n";
            }
        }
    }
} else {
    echo "Ian not found!\n";
}

echo "\n\n=== MEMBERS WITH ERRORS (No Registration Date) ===\n";
$membersNoRegDate = Member::where('is_active', true)
    ->whereNull('date_of_registration')
    ->get();

echo "Total: {$membersNoRegDate->count()}\n\n";
foreach ($membersNoRegDate as $member) {
    $hasSoftware = Invoice::where('member_id', $member->id)
        ->where(function($q) {
            $q->where('invoice_type', 'software_acquisition')
              ->orWhere('invoice_type', 'SOFTWARE');
        })
        ->whereDate('issue_date', '2025-04-22')
        ->exists();
    
    $status = $hasSoftware ? "✅ Has Software Invoice" : "❌ Missing Software Invoice";
    echo "  - {$member->name} (ID: {$member->id}) - {$status}\n";
}

echo "\n\n=== SOFTWARE INVOICES ON 2025-04-22 ===\n";
$softwareInvoices = Invoice::where(function($q) {
    $q->where('invoice_type', 'software_acquisition')
      ->orWhere('invoice_type', 'SOFTWARE');
})
->whereDate('issue_date', '2025-04-22')
->with('member')
->get();

echo "Total: {$softwareInvoices->count()}\n";
echo "Members with software invoices:\n";
foreach ($softwareInvoices->take(20) as $inv) {
    $memberName = $inv->member ? $inv->member->name : "Unknown";
    echo "  - {$memberName} - Invoice #{$inv->invoice_number} (ID: {$inv->id})\n";
}
if ($softwareInvoices->count() > 20) {
    echo "  ... and " . ($softwareInvoices->count() - 20) . " more\n";
}

echo "\n\n=== ANNUAL INVOICES ON 2025-01-01 FOR 2024 MEMBERS ===\n";
$annualInvoices = Invoice::where(function($q) {
    $q->where('invoice_type', 'annual_subscription')
      ->orWhere('invoice_type', 'SUBSCRIPTION');
})
->whereDate('issue_date', '2025-01-01')
->whereYear('issue_date', 2025)
->with('member')
->get();

$members2024 = Member::where('is_active', true)
    ->whereYear('date_of_registration', 2024)
    ->pluck('id');

$annualFor2024Members = $annualInvoices->filter(function($inv) use ($members2024) {
    return $members2024->contains($inv->member_id);
});

echo "Total annual invoices on 2025-01-01: {$annualInvoices->count()}\n";
echo "For 2024 members: {$annualFor2024Members->count()}\n";
echo "2024 members with annual invoices:\n";
foreach ($annualFor2024Members->take(20) as $inv) {
    $memberName = $inv->member ? $inv->member->name : "Unknown";
    echo "  - {$memberName} - Invoice #{$inv->invoice_number} (ID: {$inv->id})\n";
}
if ($annualFor2024Members->count() > 20) {
    echo "  ... and " . ($annualFor2024Members->count() - 20) . " more\n";
}

echo "\n\n=== DUPLICATE INVOICE NUMBERS CHECK ===\n";
$duplicates = DB::select("
    SELECT invoice_number, COUNT(*) as count, GROUP_CONCAT(member_id) as member_ids, GROUP_CONCAT(id) as invoice_ids
    FROM invoices
    WHERE (invoice_type = 'software_acquisition' AND DATE(issue_date) = '2025-04-22')
       OR (invoice_type = 'annual_subscription' AND DATE(issue_date) = '2025-01-01' AND YEAR(issue_date) = 2025)
    GROUP BY invoice_number
    HAVING count > 1
");

if (empty($duplicates)) {
    echo "✅ No duplicate invoice numbers found\n";
} else {
    echo "⚠️  Found " . count($duplicates) . " duplicate invoice numbers:\n";
    foreach ($duplicates as $dup) {
        echo "  Invoice #{$dup->invoice_number} appears {$dup->count} times\n";
        echo "    Member IDs: {$dup->member_ids}\n";
        echo "    Invoice IDs: {$dup->invoice_ids}\n\n";
    }
}

echo "\n✅ Report complete!\n";

