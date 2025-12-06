<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\InvoiceType;
use App\Models\Invoice;
use App\Models\Member;

echo "=== Checking Invoice Types ===\n";
$types = InvoiceType::all();
if ($types->isEmpty()) {
    echo "No invoice types found. Creating default types...\n";
    
    // Create registration/software invoice type
    $softwareType = InvoiceType::create([
        'code' => 'software_acquisition',
        'name' => 'Software Acquisition Fee',
        'charge_type' => InvoiceType::CHARGE_ONCE,
        'default_amount' => 2000,
        'due_days' => 30,
        'is_active' => true,
        'description' => 'One-time software acquisition fee',
    ]);
    echo "Created: {$softwareType->code} - {$softwareType->name}\n";
    
    // Create annual subscription type
    $annualType = InvoiceType::create([
        'code' => 'annual_subscription',
        'name' => 'Annual Subscription',
        'charge_type' => InvoiceType::CHARGE_YEARLY,
        'default_amount' => 1000,
        'due_days' => 30,
        'is_active' => true,
        'description' => 'Annual membership subscription',
    ]);
    echo "Created: {$annualType->code} - {$annualType->name}\n";
} else {
    foreach ($types as $type) {
        echo "  - {$type->code} ({$type->name}) - {$type->charge_type} - KES " . number_format($type->default_amount, 2) . "\n";
    }
}

echo "\n=== Checking for Duplicate Invoices ===\n";
$softwareType = InvoiceType::where('code', 'software_acquisition')->first();
$annualType = InvoiceType::where('code', 'annual_subscription')->first();

if ($softwareType) {
    $softwareInvoices = Invoice::where(function($q) use ($softwareType) {
        $q->where('invoice_type_id', $softwareType->id)
          ->orWhere('invoice_type', 'software_acquisition');
    })->whereDate('issue_date', '2025-04-22')->count();
    echo "Software invoices on 2025-04-22: {$softwareInvoices}\n";
}

if ($annualType) {
    $annualInvoices = Invoice::where(function($q) use ($annualType) {
        $q->where('invoice_type_id', $annualType->id)
          ->orWhere('invoice_type', 'annual_subscription');
    })->whereDate('issue_date', '2025-01-01')->whereYear('issue_date', 2025)->count();
    echo "Annual invoices on 2025-01-01: {$annualInvoices}\n";
}

echo "\n=== Member Counts ===\n";
$totalMembers = Member::where('is_active', true)->count();
$members2024 = Member::where('is_active', true)->whereYear('date_of_registration', 2024)->count();
echo "Total active members: {$totalMembers}\n";
echo "Members who joined in 2024: {$members2024}\n";

echo "\n✅ Ready to generate invoices\n";

