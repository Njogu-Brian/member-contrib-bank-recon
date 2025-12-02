<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Auto-Assignment Diagnostic Report\n";
echo str_repeat("=", 80) . "\n\n";

// Overall stats
$total = DB::table('transactions')->count();
$autoAssigned = DB::table('transactions')->where('assignment_status', 'auto_assigned')->count();
$manualAssigned = DB::table('transactions')->where('assignment_status', 'manual_assigned')->count();
$unassigned = DB::table('transactions')->where('assignment_status', 'unassigned')->count();
$draft = DB::table('transactions')->where('assignment_status', 'draft')->count();

echo "ASSIGNMENT STATUS:\n";
echo "  Total Transactions: {$total}\n";
echo "  Auto-assigned: {$autoAssigned} (" . round($autoAssigned/$total*100, 1) . "%)\n";
echo "  Manual-assigned: {$manualAssigned} (" . round($manualAssigned/$total*100, 1) . "%)\n";
echo "  Draft: {$draft} (" . round($draft/$total*100, 1) . "%)\n";
echo "  Unassigned: {$unassigned} (" . round($unassigned/$total*100, 1) . "%)\n\n";

// Sample unassigned transactions
echo "SAMPLE UNASSIGNED TRANSACTIONS:\n";
echo str_repeat("-", 80) . "\n";

$unassignedSamples = DB::table('transactions')
    ->where('assignment_status', 'unassigned')
    ->limit(10)
    ->get(['id', 'tran_date', 'particulars', 'credit', 'transaction_code', 'phones', 'transaction_type']);

foreach ($unassignedSamples as $tx) {
    echo "ID {$tx->id}: {$tx->tran_date}\n";
    echo "  Particulars: " . substr($tx->particulars, 0, 60) . (strlen($tx->particulars) > 60 ? '...' : '') . "\n";
    echo "  Credit: " . number_format($tx->credit, 2) . "\n";
    echo "  Type: " . ($tx->transaction_type ?? 'NULL') . "\n";
    echo "  Code: " . ($tx->transaction_code ?? 'NULL') . "\n";
    echo "  Phones: " . ($tx->phones ?? 'NULL') . "\n\n";
}

// Check transaction types
echo "TRANSACTION TYPES:\n";
echo str_repeat("-", 80) . "\n";
$types = DB::select("SELECT transaction_type, COUNT(*) as count, 
    SUM(CASE WHEN assignment_status = 'auto_assigned' THEN 1 ELSE 0 END) as assigned,
    SUM(CASE WHEN assignment_status = 'unassigned' THEN 1 ELSE 0 END) as unassigned
    FROM transactions 
    GROUP BY transaction_type");

foreach ($types as $type) {
    $typeName = $type->transaction_type ?? 'NULL';
    $assignRate = $type->count > 0 ? round($type->assigned/$type->count*100, 1) : 0;
    echo sprintf("  %-20s: %4d total, %4d assigned (%5.1f%%), %4d unassigned\n", 
        $typeName, $type->count, $type->assigned, $assignRate, $type->unassigned);
}

// Check if phones are being extracted
echo "\nPHONE EXTRACTION CHECK:\n";
echo str_repeat("-", 80) . "\n";
$withPhones = DB::table('transactions')->whereNotNull('phones')->where('phones', '!=', '[]')->count();
$withoutPhones = DB::table('transactions')->where(function($q) {
    $q->whereNull('phones')->orWhere('phones', '[]');
})->count();

echo "  With phones: {$withPhones} (" . round($withPhones/$total*100, 1) . "%)\n";
echo "  Without phones: {$withoutPhones} (" . round($withoutPhones/$total*100, 1) . "%)\n";

// Check if transaction codes are being extracted
echo "\nTRANSACTION CODE EXTRACTION:\n";
echo str_repeat("-", 80) . "\n";
$withCodes = DB::table('transactions')->whereNotNull('transaction_code')->count();
$withoutCodes = DB::table('transactions')->whereNull('transaction_code')->count();

echo "  With codes: {$withCodes} (" . round($withCodes/$total*100, 1) . "%)\n";
echo "  Without codes: {$withoutCodes} (" . round($withoutCodes/$total*100, 1) . "%)\n";

echo "\n" . str_repeat("=", 80) . "\n";


