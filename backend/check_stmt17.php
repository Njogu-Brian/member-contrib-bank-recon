<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$stmt = \App\Models\BankStatement::find(17);

echo "📊 STATEMENT 17 CREDIT ANALYSIS\n\n";
echo "Filename: {$stmt->filename}\n\n";

echo "SAVED TRANSACTIONS:\n";
$txnCount = $stmt->transactions()->count();
$txnCredits = $stmt->transactions()->sum('credit');
echo "  Count: {$txnCount}\n";
echo "  Total Credits: KES " . number_format($txnCredits, 2) . "\n\n";

echo "DUPLICATES:\n";
$dupCount = $stmt->duplicates()->count();
$dupCredits = $stmt->duplicates()->sum('credit');
echo "  Count: {$dupCount}\n";
echo "  Total Credits: KES " . number_format($dupCredits, 2) . "\n\n";

echo "COMBINED (Current UI Display):\n";
echo "  Total Count: " . ($txnCount + $dupCount) . "\n";
echo "  Total Credits: KES " . number_format($txnCredits + $dupCredits, 2) . "\n\n";

echo "PDF STATEMENT SAYS: KES 913,600.00\n\n";

echo "DISCREPANCY ANALYSIS:\n";
$diff = ($txnCredits + $dupCredits) - 913600;
echo "  Difference: KES " . number_format($diff, 2) . "\n";

if ($diff > 0) {
    echo "  System has KES " . number_format($diff, 2) . " MORE than statement\n";
    echo "  Possible causes: Over-parsing, wrong column, balance rows counted\n";
} else {
    echo "  System has KES " . number_format(abs($diff), 2) . " LESS than statement\n";
    echo "  Possible causes: Missing transactions, filtered too aggressively\n";
}

