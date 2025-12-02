<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Services\TransactionParserService;

$parser = new TransactionParserService();

echo "Transaction Parsing Quality Check\n";
echo str_repeat("=", 100) . "\n\n";

// Get sample unassigned transactions
$samples = DB::table('transactions')
    ->where('assignment_status', 'unassigned')
    ->whereNotNull('particulars')
    ->limit(10)
    ->get(['id', 'particulars', 'transaction_type', 'transaction_code', 'phones']);

echo "SAMPLE UNASSIGNED TRANSACTIONS - PARSING ANALYSIS:\n";
echo str_repeat("-", 100) . "\n";

foreach ($samples as $tx) {
    echo "\nID {$tx->id}:\n";
    echo "  Raw Particulars: " . substr($tx->particulars, 0, 80) . "\n";
    echo "  Stored Type: " . ($tx->transaction_type ?? 'NULL') . "\n";
    echo "  Stored Code: " . ($tx->transaction_code ?? 'NULL') . "\n";
    echo "  Stored Phones: " . ($tx->phones ?? 'NULL') . "\n";
    
    // Re-parse to see what parser extracts NOW
    $parsed = $parser->parseParticulars($tx->particulars);
    
    echo "  Re-parsed Type: " . ($parsed['transaction_type'] ?? 'NULL') . "\n";
    echo "  Re-parsed Code: " . ($parsed['transaction_code'] ?? 'NULL') . "\n";
    echo "  Re-parsed Phones: " . json_encode($parsed['phone_numbers'] ?? []) . "\n";
    echo "  Re-parsed Name: " . ($parsed['member_name'] ?? 'NULL') . "\n";
    
    // Check if re-parsing gives different results
    $typeChanged = ($tx->transaction_type ?? 'NULL') !== ($parsed['transaction_type'] ?? 'NULL');
    $codeChanged = ($tx->transaction_code ?? 'NULL') !== ($parsed['transaction_code'] ?? 'NULL');
    $phonesChanged = ($tx->phones ?? '[]') !== json_encode($parsed['phone_numbers'] ?? []);
    
    if ($typeChanged || $codeChanged || $phonesChanged) {
        echo "  ⚠️  MISMATCH DETECTED:\n";
        if ($typeChanged) echo "      - Type changed\n";
        if ($codeChanged) echo "      - Code changed\n";
        if ($phonesChanged) echo "      - Phones changed\n";
    }
}

echo "\n" . str_repeat("=", 100) . "\n";


