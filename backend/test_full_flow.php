<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\BankStatement;
use App\Jobs\ProcessBankStatement;

echo "🧪 FULL FLOW TEST: Parse → ProcessBankStatement → Verify\n\n";

// Test Statement 26 (the one you've been showing)
$stmt = BankStatement::find(26);

if (!$stmt) {
    echo "❌ Statement 26 not found\n";
    exit(1);
}

echo "Statement: {$stmt->filename}\n";
echo "PDF Expected: KES 84,159\n\n";

// Get current state
$before_txn_count = $stmt->transactions()->count();
$before_dup_count = $stmt->duplicates()->count();
$before_credit = $stmt->transactions()->sum('credit');

echo "BEFORE RE-PARSE:\n";
echo "  Transactions: {$before_txn_count}\n";
echo "  Duplicates: {$before_dup_count}\n";
echo "  Total Credit: KES " . number_format($before_credit, 2) . "\n\n";

// Delete existing transactions and duplicates
echo "Clearing old data...\n";
$stmt->transactions()->delete();
$stmt->duplicates()->delete();
$stmt->update(['status' => 'uploaded']);

// Re-process with current code
echo "Re-processing with current code...\n";
dispatch_sync(new ProcessBankStatement($stmt));

// Wait a moment for DB to update
sleep(1);
$stmt->refresh();

// Check results
$after_txn_count = $stmt->transactions()->count();
$after_dup_count = $stmt->duplicates()->count();
$after_credit = $stmt->transactions()->sum('credit');

echo "\nAFTER RE-PARSE:\n";
echo "  Transactions: {$after_txn_count}\n";
echo "  Duplicates: {$after_dup_count}\n";
echo "  Total Credit: KES " . number_format($after_credit, 2) . "\n";
echo "  Status: {$stmt->status}\n\n";

// Verification
echo "VERIFICATION:\n";

if ($after_dup_count === 0) {
    echo "  ✅ NO DUPLICATES DETECTED (correct!)\n";
} else {
    echo "  ❌ {$after_dup_count} DUPLICATES DETECTED (should be 0!)\n";
}

$diff = abs($after_credit - 84159);
if ($diff < 100) {
    echo "  ✅ Total credit matches PDF (diff: KES " . number_format($diff, 2) . ")\n";
} else {
    echo "  ❌ Total credit OFF by KES " . number_format($diff, 2) . "\n";
}

if ($after_txn_count === 9) {
    echo "  ✅ Transaction count correct (9)\n";
} else {
    echo "  ⚠️  Transaction count: {$after_txn_count} (expected 9)\n";
}

// Check LOCHOKA narratives
echo "\nLOCHOKA TRANSACTIONS CHECK:\n";
$lochoka = $stmt->transactions()
    ->whereDate('tran_date', '2025-12-03')
    ->orderBy('credit')
    ->get();

if ($lochoka->count() === 3) {
    echo "  ✅ Found 3 LOCHOKA transactions\n";
    foreach ($lochoka as $idx => $txn) {
        $preview = substr($txn->particulars, 0, 60);
        echo "    " . ($idx + 1) . ". {$preview} | KES " . number_format($txn->credit) . "\n";
        
        // Check if it has unique ref number
        if (preg_match('/BY:\/(\d+)/', $txn->particulars, $matches)) {
            echo "       Ref: {$matches[1]} ✅\n";
        } else {
            echo "       ⚠️  No unique ref found\n";
        }
    }
} else {
    echo "  ⚠️  Found {$lochoka->count()} LOCHOKA transactions (expected 3)\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

if ($after_dup_count === 0 && $diff < 100 && $after_txn_count === 9) {
    echo "✅ ALL CHECKS PASSED - READY TO DEPLOY!\n";
} else {
    echo "❌ SOME CHECKS FAILED - NEEDS MORE DEBUGGING\n";
}

