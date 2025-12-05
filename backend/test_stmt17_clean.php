<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 TESTING STATEMENT 17 WITH CLEAN DATABASE\n\n";

$stmt = \App\Models\BankStatement::find(17);

echo "Statement: {$stmt->filename}\n";
echo "Status: {$stmt->status}\n";
echo "PDF Expected: KES 913,600\n\n";

echo "Processing...\n";
dispatch_sync(new \App\Jobs\ProcessBankStatement($stmt));

sleep(1);
$stmt->refresh();

echo "\nRESULTS:\n";
$txnCount = $stmt->transactions()->count();
$dupCount = $stmt->duplicates()->count();
$credit = $stmt->transactions()->sum('credit');

echo "  Transactions: {$txnCount}\n";
echo "  Duplicates: {$dupCount}\n";
echo "  Total Credit: KES " . number_format($credit, 2) . "\n";
echo "  Status: {$stmt->status}\n\n";

echo "VERIFICATION:\n";

if ($dupCount === 0) {
    echo "  ✅ NO DUPLICATES DETECTED\n";
} else {
    echo "  ❌ {$dupCount} DUPLICATES FOUND (should be 0!)\n\n";
    echo "  Duplicate details:\n";
    $stmt->duplicates()->get()->each(function($dup) {
        echo "    - Reason: {$dup->duplicate_reason}\n";
        echo "      Credit: KES {$dup->credit}\n";
        echo "      Code: {$dup->transaction_code}\n";
        echo "      Particulars: " . substr($dup->particulars_snapshot, 0, 60) . "\n\n";
    });
}

$diff = abs($credit - 913600);
if ($diff < 500) {
    echo "  ✅ Total credit matches PDF (diff: KES " . number_format($diff, 2) . ")\n";
} else {
    echo "  ❌ Total credit OFF by KES " . number_format($diff, 2) . "\n";
}

echo "\n" . str_repeat("=", 80) . "\n";

if ($dupCount === 0 && $diff < 500) {
    echo "✅ PERFECT! No duplicates, credits match PDF\n";
} else {
    echo "❌ Issues detected - needs investigation\n";
}

