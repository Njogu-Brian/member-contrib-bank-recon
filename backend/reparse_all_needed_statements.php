<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔄 RE-PARSING ALL STATEMENTS THAT NEED IT\n\n";
echo str_repeat("=", 80) . "\n\n";

// Statements that need re-parsing (from analysis)
$statementsToReparse = [30, 31, 32, 33, 35, 36, 38];

// Expected totals
$expectedTotals = [
    30 => 576841,
    31 => 20000,
    32 => 917650,
    33 => 388032,
    35 => null,  // Unknown
    36 => 84159,
    38 => 84159,
];

$results = [];

foreach ($statementsToReparse as $stmtId) {
    $stmt = \App\Models\BankStatement::find($stmtId);
    
    if (!$stmt) {
        echo "  ⚠️  Statement {$stmtId} not found - skipping\n\n";
        continue;
    }
    
    echo "Processing Statement {$stmtId}: {$stmt->filename}\n";
    
    $beforeTxn = $stmt->transactions()->count();
    $beforeCredit = $stmt->transactions()->sum('credit');
    $expected = $expectedTotals[$stmtId] ?? null;
    
    echo "  Before: {$beforeTxn} transactions, KES " . number_format($beforeCredit, 2) . "\n";
    if ($expected) {
        echo "  Expected: KES " . number_format($expected, 2) . "\n";
    }
    
    // Clear and re-parse
    $stmt->transactions()->delete();
    $stmt->duplicates()->delete();
    $stmt->update(['status' => 'uploaded']);
    
    echo "  Re-parsing...\n";
    dispatch_sync(new \App\Jobs\ProcessBankStatement($stmt));
    
    sleep(1);
    $stmt->refresh();
    
    $afterTxn = $stmt->transactions()->count();
    $afterCredit = $stmt->transactions()->sum('credit');
    $afterDupes = $stmt->duplicates()->count();
    
    echo "  After: {$afterTxn} transactions, KES " . number_format($afterCredit, 2) . ", {$afterDupes} duplicates\n";
    
    $diff = $expected ? abs($afterCredit - $expected) : null;
    if ($diff !== null && $diff < 500) {
        echo "  ✅ Matches expected total!\n";
    } elseif ($diff !== null) {
        echo "  ⚠️  Off by KES " . number_format($diff, 2) . "\n";
    }
    
    if ($afterDupes === 0) {
        echo "  ✅ No duplicates detected\n";
    } else {
        echo "  ❌ {$afterDupes} duplicates still present!\n";
    }
    
    $results[] = [
        'id' => $stmtId,
        'filename' => $stmt->filename,
        'before_txn' => $beforeTxn,
        'after_txn' => $afterTxn,
        'before_credit' => $beforeCredit,
        'after_credit' => $afterCredit,
        'duplicates' => $afterDupes,
        'matches_expected' => $diff !== null && $diff < 500,
    ];
    
    echo "\n";
}

echo str_repeat("=", 80) . "\n";
echo "RE-PARSING SUMMARY:\n";
echo str_repeat("=", 80) . "\n\n";

$successCount = 0;
$totalRecovered = 0;

foreach ($results as $result) {
    $recovered = $result['after_txn'] - $result['before_txn'];
    $totalRecovered += $recovered;
    
    if ($result['duplicates'] === 0) {
        $successCount++;
        echo "  ✅ Statement {$result['id']}: {$result['filename']}\n";
        echo "     Recovered {$recovered} transactions\n";
        if ($result['matches_expected']) {
            echo "     ✅ Matches expected total\n";
        }
    } else {
        echo "  ⚠️  Statement {$result['id']}: {$result['filename']}\n";
        echo "     Still has {$result['duplicates']} duplicates\n";
    }
    echo "\n";
}

echo "Total statements re-parsed: " . count($results) . "\n";
echo "Successfully re-parsed (0 duplicates): {$successCount}\n";
echo "Total transactions recovered: {$totalRecovered}\n\n";

if ($successCount === count($results)) {
    echo "✅ ALL STATEMENTS RE-PARSED SUCCESSFULLY WITH NO DUPLICATES!\n";
} else {
    echo "⚠️  Some statements may still have issues\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

