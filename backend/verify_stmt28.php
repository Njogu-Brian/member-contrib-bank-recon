<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 VERIFYING STATEMENT 28\n\n";

$stmt = \App\Models\BankStatement::find(28);

echo "Statement: {$stmt->filename}\n";
echo "PDF Expected: KES 6,081,513 (from previous tests)\n\n";

echo "CURRENT STATE:\n";
$txnCount = $stmt->transactions()->count();
$dupCount = $stmt->duplicates()->count();
$credit = $stmt->transactions()->sum('credit');

echo "  Transactions: {$txnCount}\n";
echo "  Duplicates: {$dupCount}\n";
echo "  Total Credit: KES " . number_format($credit, 2) . "\n\n";

$expected = 6081513;
$diff = abs($credit - $expected);

echo "VERIFICATION:\n";

if ($dupCount === 0) {
    echo "  ✅ NO DUPLICATES (correct!)\n";
} else {
    echo "  ❌ {$dupCount} DUPLICATES STILL PRESENT\n";
}

if ($diff < 500) {
    echo "  ✅ Total credit matches PDF (diff: KES " . number_format($diff, 2) . ")\n";
} else {
    echo "  ⚠️  Total credit: KES " . number_format($diff, 2) . " off from PDF\n";
    echo "  💡 Consider re-parsing to capture all transactions\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

if ($dupCount === 0 && $diff < 500) {
    echo "✅ STATEMENT 28 IS CORRECT - No duplicates, credits match PDF\n";
} else if ($dupCount === 0 && $diff >= 500) {
    echo "⚠️  NO DUPLICATES but credits don't match - may need re-parsing\n";
} else {
    echo "❌ ISSUES DETECTED\n";
}

