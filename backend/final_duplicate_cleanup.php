<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧹 FINAL DUPLICATE CLEANUP - CLEARING ALL DUPLICATE DATA\n\n";
echo str_repeat("=", 80) . "\n\n";

// Step 1: Clear statement_duplicates table
echo "Step 1: Clearing statement_duplicates table...\n";
$dupCount = \App\Models\StatementDuplicate::count();
\DB::statement('SET FOREIGN_KEY_CHECKS=0');
\App\Models\StatementDuplicate::truncate();
\DB::statement('SET FOREIGN_KEY_CHECKS=1');
echo "  ✅ Deleted {$dupCount} duplicate records\n\n";

// Step 2: Reset transactions with assignment_status='duplicate'
echo "Step 2: Resetting transactions with assignment_status='duplicate'...\n";
$dupTxns = \App\Models\Transaction::where('assignment_status', 'duplicate')->count();
if ($dupTxns > 0) {
    \App\Models\Transaction::where('assignment_status', 'duplicate')
        ->update(['assignment_status' => 'unassigned']);
    echo "  ✅ Reset {$dupTxns} transactions to 'unassigned'\n\n";
} else {
    echo "  ✅ No transactions with 'duplicate' status\n\n";
}

// Step 3: Verify all statements
echo "Step 3: Verifying all statements...\n";
$allStmts = \App\Models\BankStatement::all();
$totalDupes = 0;
$totalTxns = 0;
$totalCredit = 0;

foreach ($allStmts as $stmt) {
    $dupCount = $stmt->duplicates()->count();
    $txnCount = $stmt->transactions()->count();
    $credit = $stmt->transactions()->sum('credit');
    
    $totalDupes += $dupCount;
    $totalTxns += $txnCount;
    $totalCredit += $credit;
    
    if ($dupCount > 0) {
        echo "  ⚠️  Statement {$stmt->id}: {$dupCount} duplicates still present\n";
    }
}

echo "\n  Total statements: {$allStmts->count()}\n";
echo "  Total transactions: {$totalTxns}\n";
echo "  Total duplicates: {$totalDupes}\n";
echo "  Total credit: KES " . number_format($totalCredit, 2) . "\n\n";

// Final verification
echo str_repeat("=", 80) . "\n";
echo "FINAL VERIFICATION:\n";
echo str_repeat("=", 80) . "\n\n";

$finalDupes = \App\Models\StatementDuplicate::count();
$finalDupTxns = \App\Models\Transaction::where('assignment_status', 'duplicate')->count();

if ($finalDupes === 0 && $finalDupTxns === 0) {
    echo "✅ SUCCESS! All duplicate data cleared:\n";
    echo "   - statement_duplicates table: {$finalDupes} records\n";
    echo "   - Transactions with 'duplicate' status: {$finalDupTxns}\n";
    echo "\n✅ Database is clean - ready for fresh parsing with new code!\n";
} else {
    echo "⚠️  WARNING: Some duplicates may still exist:\n";
    echo "   - statement_duplicates table: {$finalDupes} records\n";
    echo "   - Transactions with 'duplicate' status: {$finalDupTxns}\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

