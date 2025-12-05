<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔄 RE-PARSING STATEMENT 27\n\n";

$stmt = \App\Models\BankStatement::find(27);

echo "Statement: {$stmt->filename}\n";
echo "PDF Expected: KES 2,556,091 (from your screenshot)\n\n";

echo "BEFORE RE-PARSE:\n";
echo "  Transactions: {$stmt->transactions()->count()}\n";
echo "  Duplicates: {$stmt->duplicates()->count()}\n";
echo "  Total Credit: KES " . number_format($stmt->transactions()->sum('credit'), 2) . "\n\n";

echo "Clearing old data...\n";
$stmt->transactions()->delete();
$stmt->duplicates()->delete();
$stmt->update(['status' => 'uploaded']);

echo "Re-processing with NEW code (no duplicate detection)...\n";
dispatch_sync(new \App\Jobs\ProcessBankStatement($stmt));

sleep(1);
$stmt->refresh();

echo "\nAFTER RE-PARSE:\n";
$txnCount = $stmt->transactions()->count();
$dupCount = $stmt->duplicates()->count();
$credit = $stmt->transactions()->sum('credit');

echo "  Transactions: {$txnCount}\n";
echo "  Duplicates: {$dupCount}\n";
echo "  Total Credit: KES " . number_format($credit, 2) . "\n";
echo "  Status: {$stmt->status}\n\n";

echo "VERIFICATION:\n";

if ($dupCount === 0) {
    echo "  ✅ NO DUPLICATES DETECTED (correct!)\n";
} else {
    echo "  ❌ {$dupCount} DUPLICATES DETECTED (bug exists!)\n";
}

$expected = 2556091;
$diff = abs($credit - $expected);
if ($diff < 500) {
    echo "  ✅ Total credit matches PDF (diff: KES " . number_format($diff, 2) . ")\n";
} else {
    echo "  ⚠️  Total credit: KES " . number_format($diff, 2) . " off\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

if ($dupCount === 0 && $diff < 500) {
    echo "✅ PASSED - Statement 27 parses correctly with NO duplicates\n";
} else {
    echo "❌ FAILED - Issues detected\n";
}

