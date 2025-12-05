<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 CHECKING STATEMENT 28\n\n";

$stmt = \App\Models\BankStatement::find(28);

if (!$stmt) {
    echo "❌ Statement 28 not found\n";
    exit(1);
}

echo "Statement: {$stmt->filename}\n";
echo "Status: {$stmt->status}\n\n";

echo "BEFORE CLEANUP:\n";
echo "  Transactions: {$stmt->transactions()->count()}\n";
echo "  Duplicates: {$stmt->duplicates()->count()}\n";
echo "  Total Credit: KES " . number_format($stmt->transactions()->sum('credit'), 2) . "\n\n";

// Check ALL statements for duplicates
echo "CHECKING ALL STATEMENTS FOR DUPLICATES:\n";
$allStmts = \App\Models\BankStatement::all();
$totalDupes = 0;
foreach ($allStmts as $s) {
    $dupCount = $s->duplicates()->count();
    if ($dupCount > 0) {
        echo "  Statement {$s->id}: {$dupCount} duplicates\n";
        $totalDupes += $dupCount;
    }
}
echo "\n  Total duplicates across all statements: {$totalDupes}\n\n";

// Clear ALL duplicates from ALL statements
echo "🧹 CLEARING ALL DUPLICATE RECORDS...\n\n";

\DB::statement('SET FOREIGN_KEY_CHECKS=0');
$deleted = \App\Models\StatementDuplicate::truncate();
\DB::statement('SET FOREIGN_KEY_CHECKS=1');

echo "✅ Deleted ALL duplicate records from statement_duplicates table\n\n";

// Also check if any transactions have assignment_status = 'duplicate'
echo "CHECKING FOR TRANSACTIONS WITH assignment_status='duplicate':\n";
$dupTxns = \App\Models\Transaction::where('assignment_status', 'duplicate')->count();
echo "  Found: {$dupTxns} transactions\n";

if ($dupTxns > 0) {
    echo "  Resetting to 'unassigned'...\n";
    \App\Models\Transaction::where('assignment_status', 'duplicate')
        ->update(['assignment_status' => 'unassigned']);
    echo "  ✅ Reset {$dupTxns} transactions\n";
}

echo "\n" . str_repeat("=", 80) . "\n";
echo "AFTER CLEANUP:\n";
echo str_repeat("=", 80) . "\n\n";

$stmt->refresh();
echo "Statement 28:\n";
echo "  Transactions: {$stmt->transactions()->count()}\n";
echo "  Duplicates: {$stmt->duplicates()->count()}\n";
echo "  Total Credit: KES " . number_format($stmt->transactions()->sum('credit'), 2) . "\n\n";

$allDupes = \App\Models\StatementDuplicate::count();
echo "Total duplicates in database: {$allDupes}\n";

if ($allDupes === 0 && $dupTxns === 0) {
    echo "\n✅ ALL DUPLICATE DATA CLEARED!\n";
} else {
    echo "\n⚠️  Some duplicates may still exist\n";
}

