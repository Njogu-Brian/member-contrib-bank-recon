<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 SIMULATING: PARSING WITH NO DUPLICATE DETECTION\n\n";

// Get Statement 17
$stmt = \App\Models\BankStatement::find(17);
echo "Statement: {$stmt->filename}\n";
echo "PDF Grand Total: KES 913,600.00\n\n";

// Current state
echo "CURRENT STATE:\n";
echo "  Saved: " . $stmt->transactions()->count() . " | KES " . number_format($stmt->transactions()->sum('credit'), 2) . "\n";
echo "  Dupes: " . $stmt->duplicates()->count() . " | KES " . number_format($stmt->duplicates()->sum('credit'), 2) . "\n";
echo "  Total: " . ($stmt->transactions()->count() + $stmt->duplicates()->count()) . " transactions\n\n";

// Simulate: What if we saved ALL (including current duplicates)?
$allCount = $stmt->transactions()->count() + $stmt->duplicates()->count();
$validDuplicateCredits = 0;

// Check each duplicate
echo "ANALYZING DUPLICATES:\n";
foreach ($stmt->duplicates as $idx => $dup) {
    $num = $idx + 1;
    $credit = $dup->credit ?? 0;
    
    // Flag if credit is suspiciously large (likely a balance row)
    $suspicious = $credit > 100000;
    $marker = $suspicious ? "🚨 SUSPICIOUS" : "✅ Valid";
    
    echo "  #{$num}: KES " . number_format($credit, 2) . " {$marker}\n";
    
    if (!$suspicious) {
        $validDuplicateCredits += $credit;
    }
}

echo "\nPROJECTED TOTAL (if we saved all valid transactions):\n";
$projectedCredits = $stmt->transactions()->sum('credit') + $validDuplicateCredits;
echo "  Count: {$allCount}\n";
echo "  Credits: KES " . number_format($projectedCredits, 2) . "\n";
echo "  PDF says: KES 913,600.00\n";
echo "  Difference: KES " . number_format(913600 - $projectedCredits, 2) . "\n\n";

if (abs(913600 - $projectedCredits) < 100) {
    echo "✅ CLOSE MATCH! Removing duplicate detection will give accurate totals.\n";
} else {
    echo "⚠️  Still off by more than KES 100. Parser might be missing transactions.\n";
}

