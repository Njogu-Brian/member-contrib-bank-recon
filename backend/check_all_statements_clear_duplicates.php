<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 CHECKING ALL STATEMENTS AND CLEARING DUPLICATES\n\n";
echo str_repeat("=", 80) . "\n\n";

// Step 1: Check all statements for duplicates
echo "Step 1: Checking all statements for duplicates...\n\n";

$allStmts = \App\Models\BankStatement::orderBy('id')->get();
$statementsWithDupes = [];
$totalDupesBefore = 0;

foreach ($allStmts as $stmt) {
    $dupCount = $stmt->duplicates()->count();
    $txnCount = $stmt->transactions()->count();
    $credit = $stmt->transactions()->sum('credit');
    
    if ($dupCount > 0) {
        $statementsWithDupes[] = $stmt;
        echo "  ⚠️  Statement {$stmt->id}: {$stmt->filename}\n";
        echo "      Transactions: {$txnCount} | Duplicates: {$dupCount} | Credit: KES " . number_format($credit, 2) . "\n";
        $totalDupesBefore += $dupCount;
    } else {
        echo "  ✅ Statement {$stmt->id}: {$stmt->filename} - No duplicates\n";
    }
}

echo "\n  Total statements: {$allStmts->count()}\n";
echo "  Statements with duplicates: " . count($statementsWithDupes) . "\n";
echo "  Total duplicate records: {$totalDupesBefore}\n\n";

// Step 2: Clear ALL duplicate records
echo str_repeat("=", 80) . "\n";
echo "Step 2: Clearing ALL duplicate records...\n\n";

\DB::statement('SET FOREIGN_KEY_CHECKS=0');
$deleted = \App\Models\StatementDuplicate::truncate();
\DB::statement('SET FOREIGN_KEY_CHECKS=1');

echo "  ✅ Cleared statement_duplicates table\n";

// Step 3: Reset transactions with duplicate status
echo "\nStep 3: Resetting transactions with assignment_status='duplicate'...\n";
$dupTxns = \App\Models\Transaction::where('assignment_status', 'duplicate')->count();
if ($dupTxns > 0) {
    \App\Models\Transaction::where('assignment_status', 'duplicate')
        ->update(['assignment_status' => 'unassigned']);
    echo "  ✅ Reset {$dupTxns} transactions to 'unassigned'\n";
} else {
    echo "  ✅ No transactions with 'duplicate' status\n";
}

// Step 4: Verify cleanup
echo "\n" . str_repeat("=", 80) . "\n";
echo "Step 4: Verifying cleanup...\n\n";

$finalDupes = \App\Models\StatementDuplicate::count();
$finalDupTxns = \App\Models\Transaction::where('assignment_status', 'duplicate')->count();

// Re-check all statements
$remainingDupes = 0;
foreach ($allStmts as $stmt) {
    $dupCount = $stmt->duplicates()->count();
    $remainingDupes += $dupCount;
}

echo "  statement_duplicates table: {$finalDupes} records\n";
echo "  Transactions with 'duplicate' status: {$finalDupTxns}\n";
echo "  Duplicates across all statements: {$remainingDupes}\n\n";

// Step 5: Summary
echo str_repeat("=", 80) . "\n";
echo "FINAL SUMMARY:\n";
echo str_repeat("=", 80) . "\n\n";

$totalTxns = \App\Models\Transaction::count();
$totalCredit = \App\Models\Transaction::sum('credit');

echo "Total statements: {$allStmts->count()}\n";
echo "Total transactions: {$totalTxns}\n";
echo "Total credit: KES " . number_format($totalCredit, 2) . "\n";
echo "Total duplicates: {$remainingDupes}\n\n";

if ($finalDupes === 0 && $finalDupTxns === 0 && $remainingDupes === 0) {
    echo "✅ SUCCESS! All duplicate data cleared successfully!\n";
    echo "   - No duplicate records in statement_duplicates table\n";
    echo "   - No transactions with 'duplicate' status\n";
    echo "   - All statements verified clean\n";
    echo "\n✅ Database is clean and ready!\n";
} else {
    echo "⚠️  WARNING: Some duplicates may still exist:\n";
    if ($finalDupes > 0) {
        echo "   - {$finalDupes} records in statement_duplicates table\n";
    }
    if ($finalDupTxns > 0) {
        echo "   - {$finalDupTxns} transactions with 'duplicate' status\n";
    }
    if ($remainingDupes > 0) {
        echo "   - {$remainingDupes} duplicates across statements\n";
    }
}

echo "\n" . str_repeat("=", 80) . "\n";

