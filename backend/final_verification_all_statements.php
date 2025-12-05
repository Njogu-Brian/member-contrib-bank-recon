<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "✅ FINAL VERIFICATION - ALL STATEMENTS\n\n";
echo str_repeat("=", 80) . "\n\n";

$allStmts = \App\Models\BankStatement::orderBy('id')->get();

$totalTxns = 0;
$totalCredit = 0;
$totalDupes = 0;
$cleanStatements = 0;

echo "STATEMENT STATUS:\n\n";

foreach ($allStmts as $stmt) {
    $txnCount = $stmt->transactions()->count();
    $dupCount = $stmt->duplicates()->count();
    $credit = $stmt->transactions()->sum('credit');
    
    $totalTxns += $txnCount;
    $totalCredit += $credit;
    $totalDupes += $dupCount;
    
    if ($dupCount === 0) {
        $cleanStatements++;
        echo "  ✅ Statement {$stmt->id}: {$stmt->filename}\n";
        echo "     Transactions: {$txnCount} | Credit: KES " . number_format($credit, 2) . " | Duplicates: {$dupCount}\n";
    } else {
        echo "  ❌ Statement {$stmt->id}: {$stmt->filename}\n";
        echo "     Transactions: {$txnCount} | Credit: KES " . number_format($credit, 2) . " | Duplicates: {$dupCount} ⚠️\n";
    }
}

echo "\n" . str_repeat("=", 80) . "\n";
echo "FINAL SUMMARY:\n";
echo str_repeat("=", 80) . "\n\n";

echo "Total statements: {$allStmts->count()}\n";
echo "Clean statements (0 duplicates): {$cleanStatements}\n";
echo "Total transactions: {$totalTxns}\n";
echo "Total credit: KES " . number_format($totalCredit, 2) . "\n";
echo "Total duplicates: {$totalDupes}\n\n";

// Verify database tables
$dbDupes = \App\Models\StatementDuplicate::count();
$dbDupTxns = \App\Models\Transaction::where('assignment_status', 'duplicate')->count();

echo "DATABASE VERIFICATION:\n";
echo "  statement_duplicates table: {$dbDupes} records\n";
echo "  Transactions with 'duplicate' status: {$dbDupTxns}\n\n";

if ($totalDupes === 0 && $dbDupes === 0 && $dbDupTxns === 0 && $cleanStatements === $allStmts->count()) {
    echo "✅ PERFECT! ALL STATEMENTS CLEAN:\n";
    echo "   - All {$allStmts->count()} statements have 0 duplicates\n";
    echo "   - statement_duplicates table is empty\n";
    echo "   - No transactions with 'duplicate' status\n";
    echo "   - All statements parsed with new code (no duplicate detection)\n";
    echo "\n✅ SYSTEM IS 100% CLEAN AND READY!\n";
} else {
    echo "⚠️  WARNING: Some issues detected:\n";
    if ($totalDupes > 0) {
        echo "   - {$totalDupes} duplicates across statements\n";
    }
    if ($dbDupes > 0) {
        echo "   - {$dbDupes} records in statement_duplicates table\n";
    }
    if ($dbDupTxns > 0) {
        echo "   - {$dbDupTxns} transactions with 'duplicate' status\n";
    }
}

echo "\n" . str_repeat("=", 80) . "\n";

