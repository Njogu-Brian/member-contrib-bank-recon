<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 IDENTIFYING STATEMENTS THAT MAY NEED RE-PARSING\n\n";
echo str_repeat("=", 80) . "\n\n";

// Expected PDF totals from previous tests
$expectedTotals = [
    17 => 913600,      // JOINT 04-04-2025
    27 => 2556091,     // JOINT ACCOUNT 01-09-2024
    28 => 6081513,     // EVIMERIA 30.10.2024
    29 => 1154485,     // Paybill
    30 => 576841,      // EVIMERIA OCT
    31 => 20000,       // JOINT 02-10-2025
    32 => 917650,      // EVIMERIA (1)
    33 => 388032,      // Account_statementTB251128
    34 => null,        // Unknown
    35 => null,        // Unknown
    36 => 84159,       // Account_statementTB251204
    37 => null,        // Unknown
    38 => 84159,       // EvimeriaAccount_statementTB251205
];

$allStmts = \App\Models\BankStatement::orderBy('id')->get();
$needsReparse = [];

echo "STATEMENT ANALYSIS:\n\n";

foreach ($allStmts as $stmt) {
    $txnCount = $stmt->transactions()->count();
    $credit = $stmt->transactions()->sum('credit');
    $expected = $expectedTotals[$stmt->id] ?? null;
    
    $issues = [];
    
    // Check if statement has very few transactions (might be incomplete)
    if ($txnCount == 0) {
        $issues[] = "NO TRANSACTIONS";
    } elseif ($txnCount < 5 && $credit < 50000) {
        $issues[] = "VERY FEW TRANSACTIONS ({$txnCount})";
    }
    
    // Check if credit doesn't match expected
    if ($expected !== null) {
        $diff = abs($credit - $expected);
        $percentDiff = $expected > 0 ? ($diff / $expected) * 100 : 0;
        
        if ($diff > 500 && $percentDiff > 2) {
            $issues[] = "CREDIT MISMATCH (Expected: KES " . number_format($expected) . ", Got: KES " . number_format($credit) . ", Diff: " . number_format($percentDiff, 1) . "%)";
        }
    }
    
    if (count($issues) > 0) {
        $needsReparse[] = $stmt;
        echo "  ⚠️  Statement {$stmt->id}: {$stmt->filename}\n";
        echo "      Transactions: {$txnCount} | Credit: KES " . number_format($credit, 2) . "\n";
        foreach ($issues as $issue) {
            echo "      - {$issue}\n";
        }
        echo "\n";
    } else {
        echo "  ✅ Statement {$stmt->id}: {$stmt->filename} - Looks good\n";
    }
}

echo "\n" . str_repeat("=", 80) . "\n";
echo "SUMMARY:\n";
echo str_repeat("=", 80) . "\n\n";

echo "Total statements: {$allStmts->count()}\n";
echo "Statements that may need re-parsing: " . count($needsReparse) . "\n\n";

if (count($needsReparse) > 0) {
    echo "⚠️  The following statements may have been parsed with old code:\n";
    foreach ($needsReparse as $stmt) {
        echo "   - Statement {$stmt->id}: {$stmt->filename}\n";
    }
    echo "\n💡 Recommendation: Re-parse these statements to ensure all transactions are captured.\n";
} else {
    echo "✅ All statements look good - no re-parsing needed!\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

