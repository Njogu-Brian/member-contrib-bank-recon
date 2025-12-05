<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧹 CLEANING LOCAL DATABASE\n\n";

echo "Step 1: Deleting all transactions...\n";
$txnCount = \App\Models\Transaction::count();
\DB::statement('SET FOREIGN_KEY_CHECKS=0');
\App\Models\Transaction::truncate();
\DB::statement('SET FOREIGN_KEY_CHECKS=1');
echo "  ✅ Deleted {$txnCount} transactions\n";

echo "Step 2: Deleting all statement duplicates...\n";
$dupCount = \App\Models\StatementDuplicate::count();
\DB::statement('SET FOREIGN_KEY_CHECKS=0');
\App\Models\StatementDuplicate::truncate();
\DB::statement('SET FOREIGN_KEY_CHECKS=1');
echo "  ✅ Deleted {$dupCount} duplicate records\n";

echo "Step 3: Deleting all invoices...\n";
$invCount = \App\Models\Invoice::count();
\DB::statement('SET FOREIGN_KEY_CHECKS=0');
\App\Models\Invoice::truncate();
\DB::statement('SET FOREIGN_KEY_CHECKS=1');
echo "  ✅ Deleted {$invCount} invoices\n";

echo "Step 4: Resetting statement status...\n";
$updated = \App\Models\BankStatement::where('status', 'completed')
    ->update(['status' => 'uploaded']);
echo "  ✅ Reset {$updated} statements to 'uploaded'\n";

echo "\n" . str_repeat("=", 80) . "\n";
echo "DATABASE CLEANED\n";
echo str_repeat("=", 80) . "\n\n";

// Now test parsing ONE statement
echo "🧪 TESTING: Parse Statement 26 with clean database\n\n";

$stmt = \App\Models\BankStatement::find(26);
if (!$stmt) {
    echo "❌ Statement 26 not found\n";
    exit(1);
}

echo "Statement: {$stmt->filename}\n";
echo "Status: {$stmt->status}\n\n";

// Process it
echo "Processing...\n";
dispatch_sync(new \App\Jobs\ProcessBankStatement($stmt));

sleep(1);
$stmt->refresh();

// Check results
echo "\nRESULTS:\n";
echo "  Transactions: {$stmt->transactions()->count()}\n";
echo "  Duplicates: {$stmt->duplicates()->count()}\n";
echo "  Total Credit: KES " . number_format($stmt->transactions()->sum('credit'), 2) . "\n";
echo "  Status: {$stmt->status}\n";

// Verify
echo "\nVERIFICATION:\n";

if ($stmt->duplicates()->count() === 0) {
    echo "  ✅ NO DUPLICATES (correct!)\n";
} else {
    echo "  ❌ {$stmt->duplicates()->count()} DUPLICATES DETECTED (bug!)\n";
    echo "\n  Duplicate details:\n";
    $stmt->duplicates->each(function($dup) {
        echo "    - Reason: {$dup->duplicate_reason} | Credit: {$dup->credit} | Code: {$dup->transaction_code}\n";
    });
}

$expected = 84159;
$actual = $stmt->transactions()->sum('credit');
$diff = abs($actual - $expected);

if ($diff < 100) {
    echo "  ✅ Total credit matches PDF (diff: KES " . number_format($diff, 2) . ")\n";
} else {
    echo "  ❌ Total credit OFF by KES " . number_format($diff, 2) . "\n";
}

// Check for any other issues
echo "\n🔍 CHECKING FOR OTHER ISSUES:\n";

try {
    $memberCount = \App\Models\Member::count();
    echo "  ✅ Members table accessible ({$memberCount} members)\n";
} catch (\Exception $e) {
    echo "  ❌ Members table error: " . $e->getMessage() . "\n";
}

try {
    $invoiceCount = \App\Models\Invoice::count();
    echo "  ✅ Invoices table accessible ({$invoiceCount} invoices)\n";
} catch (\Exception $e) {
    echo "  ❌ Invoices table error: " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

if ($stmt->duplicates()->count() === 0 && $diff < 100) {
    echo "✅ ALL TESTS PASSED - SYSTEM WORKING CORRECTLY\n";
} else {
    echo "❌ ISSUES FOUND - NEEDS DEBUGGING\n";
}

