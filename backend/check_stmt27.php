<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 CHECKING STATEMENT 27\n\n";

$stmt = \App\Models\BankStatement::find(27);

if (!$stmt) {
    echo "❌ Statement 27 not found\n";
    exit(1);
}

echo "Statement: {$stmt->filename}\n";
echo "Status: {$stmt->status}\n\n";

echo "COUNTS:\n";
echo "  Transactions: {$stmt->transactions()->count()}\n";
echo "  Duplicates: {$stmt->duplicates()->count()}\n";
echo "  Total Credit: KES " . number_format($stmt->transactions()->sum('credit'), 2) . "\n\n";

if ($stmt->duplicates()->count() > 0) {
    echo "DUPLICATE RECORDS (first 17):\n";
    $duplicates = $stmt->duplicates()->orderBy('id')->take(17)->get();
    
    foreach ($duplicates as $idx => $dup) {
        $num = $idx + 1;
        echo "\n#{$num}:\n";
        echo "  Reason: {$dup->duplicate_reason}\n";
        echo "  Credit: KES " . number_format($dup->credit ?? 0, 2) . "\n";
        echo "  Transaction Code: {$dup->transaction_code}\n";
        echo "  Particulars: " . substr($dup->particulars_snapshot ?? 'N/A', 0, 80) . "\n";
        echo "  Existing Transaction ID: {$dup->transaction_id}\n";
        
        // Check if existing transaction is in SAME statement or different
        if ($dup->transaction_id) {
            $existingTxn = \App\Models\Transaction::find($dup->transaction_id);
            if ($existingTxn) {
                echo "  Existing in Statement: {$existingTxn->bank_statement_id}\n";
                if ($existingTxn->bank_statement_id == $stmt->id) {
                    echo "  🚨 DUPLICATE WITHIN SAME STATEMENT!\n";
                } else {
                    echo "  Cross-statement duplicate\n";
                }
            }
        }
    }
}

echo "\n🔍 CHECKING IF ProcessBankStatement IS STILL DETECTING DUPLICATES:\n\n";

// Read the ProcessBankStatement code
$code = file_get_contents(__DIR__ . '/app/Jobs/ProcessBankStatement.php');

// Check for duplicate detection patterns
$patterns = [
    'recordDuplicate' => substr_count($code, 'recordDuplicate'),
    'existingByCode' => substr_count($code, 'existingByCode'),
    'existingByHash' => substr_count($code, 'existingByHash'),
    'possibleDuplicate' => substr_count($code, 'possibleDuplicate'),
    'duplicateCount++' => substr_count($code, 'duplicateCount++'),
];

foreach ($patterns as $pattern => $count) {
    echo "  '{$pattern}': {$count} occurrences";
    if ($count > 0) {
        echo " 🚨 STILL PRESENT!";
    }
    echo "\n";
}

