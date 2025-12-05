<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$stmt = \App\Models\BankStatement::find(17);

echo "🔍 STATEMENT 17 - DUPLICATE ANALYSIS\n\n";

$duplicates = $stmt->duplicates()->get();

echo "Total duplicates: {$duplicates->count()}\n\n";

foreach ($duplicates as $idx => $dup) {
    $num = $idx + 1;
    echo "Duplicate #{$num}:\n";
    echo "  Credit: KES " . number_format($dup->credit, 2) . "\n";
    echo "  Debit: KES " . number_format($dup->debit ?? 0, 2) . "\n";
    echo "  Date: {$dup->tran_date}\n";
    echo "  Particulars: " . substr($dup->particulars_snapshot ?? 'N/A', 0, 60) . "\n";
    echo "  Reason: {$dup->duplicate_reason}\n";
    echo "  Existing Transaction ID: {$dup->transaction_id}\n\n";
}

echo "PROBLEM: Duplicate credits sum to KES " . number_format($duplicates->sum('credit'), 2) . "\n";
echo "This is inflating the UI total!\n\n";

echo "CORRECT APPROACH:\n";
echo "  UI Transaction Count: " . ($stmt->transactions()->count() + $duplicates->count()) . " (saved + dupes)\n";
echo "  UI Total Credit: KES " . number_format($stmt->transactions()->sum('credit'), 2) . " (ONLY from saved, NOT from dupes)\n";

