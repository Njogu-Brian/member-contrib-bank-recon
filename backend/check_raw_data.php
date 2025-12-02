<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Checking Raw Transaction Data\n";
echo str_repeat("=", 80) . "\n\n";

// Check if raw_text or raw_json has better data
$sample = DB::table('transactions')
    ->where('assignment_status', 'unassigned')
    ->limit(5)
    ->get(['id', 'particulars', 'raw_text', 'raw_json', 'transaction_code', 'phones']);

foreach ($sample as $tx) {
    echo "Transaction ID: {$tx->id}\n";
    echo "  Particulars: " . substr($tx->particulars, 0, 60) . "\n";
    echo "  Raw Text: " . substr($tx->raw_text ?? 'NULL', 0, 60) . "\n";
    
    if ($tx->raw_json) {
        $rawJson = json_decode($tx->raw_json, true);
        echo "  Raw JSON keys: " . implode(', ', array_keys($rawJson)) . "\n";
        if (isset($rawJson['particulars'])) {
            echo "  Raw JSON particulars: " . substr($rawJson['particulars'], 0, 60) . "\n";
        }
    }
    
    echo "  Stored Code: " . ($tx->transaction_code ?? 'NULL') . "\n";
    echo "  Stored Phones: " . ($tx->phones ?? 'NULL') . "\n";
    echo "\n";
}

// Check transaction types for NULL
echo "\nTRANSACTIONS WITH NULL TYPE:\n";
echo str_repeat("-", 80) . "\n";

$nullTypeSamples = DB::table('transactions')
    ->whereNull('transaction_type')
    ->limit(5)
    ->get(['id', 'particulars', 'credit']);

foreach ($nullTypeSamples as $tx) {
    echo "ID {$tx->id}: " . substr($tx->particulars, 0, 70) . "\n";
    echo "  Credit: " . number_format($tx->credit, 2) . "\n\n";
}

echo str_repeat("=", 80) . "\n";


