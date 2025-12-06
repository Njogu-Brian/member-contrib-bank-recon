<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Invoice;
use App\Models\InvoiceType;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

echo "=== FIXING IAN'S MISSING INVOICES ===\n\n";

$ian = Member::find(98);
if (!$ian) {
    echo "ERROR: Ian not found!\n";
    exit(1);
}

echo "Member: {$ian->name} (ID: {$ian->id})\n";
echo "Registration Date: " . ($ian->date_of_registration ? Carbon::parse($ian->date_of_registration)->format('Y-m-d') : 'N/A') . "\n\n";

$softwareType = InvoiceType::where('code', 'software_acquisition')->first();
$annualType = InvoiceType::where('code', 'annual_subscription')->first();

if (!$softwareType || !$annualType) {
    echo "ERROR: Invoice types not found!\n";
    exit(1);
}

// 1. Create Software Invoice for April 22, 2025
echo "1. Creating Software Invoice (2025-04-22)...\n";

// Check if already exists
$exists = Invoice::where('member_id', 98)
    ->where(function($q) use ($softwareType) {
        $q->where('invoice_type_id', $softwareType->id)
          ->orWhere('invoice_type', 'software_acquisition');
    })
    ->whereDate('issue_date', '2025-04-22')
    ->exists();

if ($exists) {
    echo "   Already exists, skipping.\n";
} else {
    // Find next available invoice number
    $maxNum = DB::select("
        SELECT MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)) as max_num 
        FROM invoices 
        WHERE invoice_number LIKE 'SFT-20250422-%'
    ");
    $nextNum = ($maxNum[0]->max_num ?? 0) + 1;
    $invoiceNumber = 'SFT-20250422-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    
    // Verify it doesn't exist
    while (Invoice::where('invoice_number', $invoiceNumber)->exists()) {
        $nextNum++;
        $invoiceNumber = 'SFT-20250422-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    }
    
    try {
        DB::beginTransaction();
        
        $softwareInvoice = Invoice::create([
            'member_id' => 98,
            'invoice_number' => $invoiceNumber,
            'amount' => $softwareType->default_amount,
            'issue_date' => Carbon::parse('2025-04-22'),
            'due_date' => Carbon::parse('2025-04-22')->addDays($softwareType->due_days),
            'status' => 'pending',
            'period' => 'SOFTWARE-2025',
            'invoice_type' => $softwareType->code,
            'invoice_type_id' => $softwareType->id,
            'description' => "Software acquisition fee (Member joined: " . Carbon::parse($ian->date_of_registration)->format('M d, Y') . ")",
        ]);
        
        DB::commit();
        echo "   ✅ Created: Invoice #{$invoiceNumber} (ID: {$softwareInvoice->id})\n";
    } catch (\Exception $e) {
        DB::rollBack();
        echo "   ❌ Error: " . $e->getMessage() . "\n";
    }
}

// 2. Create Annual Invoice for January 1, 2025
echo "\n2. Creating Annual Invoice (2025-01-01)...\n";

// Check if already exists
$exists = Invoice::where('member_id', 98)
    ->where(function($q) use ($annualType) {
        $q->where('invoice_type_id', $annualType->id)
          ->orWhere('invoice_type', 'annual_subscription');
    })
    ->whereDate('issue_date', '2025-01-01')
    ->whereYear('issue_date', 2025)
    ->exists();

if ($exists) {
    echo "   Already exists, skipping.\n";
} else {
    // Find next available invoice number
    $maxNum = DB::select("
        SELECT MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)) as max_num 
        FROM invoices 
        WHERE invoice_number LIKE 'SUB-20250101-%'
    ");
    $nextNum = ($maxNum[0]->max_num ?? 0) + 1;
    $invoiceNumber = 'SUB-20250101-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    
    // Verify it doesn't exist
    while (Invoice::where('invoice_number', $invoiceNumber)->exists()) {
        $nextNum++;
        $invoiceNumber = 'SUB-20250101-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
    }
    
    try {
        DB::beginTransaction();
        
        $annualInvoice = Invoice::create([
            'member_id' => 98,
            'invoice_number' => $invoiceNumber,
            'amount' => $annualType->default_amount > 0 ? $annualType->default_amount : 1000,
            'issue_date' => Carbon::parse('2025-01-01'),
            'due_date' => Carbon::parse('2025-01-01')->addDays($annualType->due_days),
            'status' => 'pending',
            'period' => 'YEAR-2025',
            'invoice_type' => $annualType->code,
            'invoice_type_id' => $annualType->id,
            'invoice_year' => 2025,
            'description' => "Annual subscription for 2025 (Member joined in 2024)",
        ]);
        
        DB::commit();
        echo "   ✅ Created: Invoice #{$invoiceNumber} (ID: {$annualInvoice->id})\n";
    } catch (\Exception $e) {
        DB::rollBack();
        echo "   ❌ Error: " . $e->getMessage() . "\n";
    }
}

// Verify
echo "\n\n3. Verification:\n";
$ianSoftware = Invoice::where('member_id', 98)
    ->where(function($q) use ($softwareType) {
        $q->where('invoice_type_id', $softwareType->id)
          ->orWhere('invoice_type', 'software_acquisition');
    })
    ->whereDate('issue_date', '2025-04-22')
    ->count();

$ianAnnual = Invoice::where('member_id', 98)
    ->where(function($q) use ($annualType) {
        $q->where('invoice_type_id', $annualType->id)
          ->orWhere('invoice_type', 'annual_subscription');
    })
    ->whereDate('issue_date', '2025-01-01')
    ->whereYear('issue_date', 2025)
    ->count();

echo "   Software invoices on 2025-04-22: {$ianSoftware}\n";
echo "   Annual invoices on 2025-01-01: {$ianAnnual}\n";

if ($ianSoftware > 0 && $ianAnnual > 0) {
    echo "\n✅ SUCCESS: Ian now has both invoices!\n";
} else {
    echo "\n⚠️  WARNING: Some invoices may still be missing.\n";
}

echo "\n✅ Fix complete!\n";

