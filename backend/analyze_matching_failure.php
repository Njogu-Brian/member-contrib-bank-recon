<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\Member;

echo "Matching Failure Analysis\n";
echo str_repeat("=", 80) . "\n\n";

// Get member count
$memberCount = Member::where('is_active', true)->count();
echo "Active Members: {$memberCount}\n\n";

// Check if members have phone numbers
$membersWithPhones = Member::where('is_active', true)->whereNotNull('phone')->count();
echo "Members with phones: {$membersWithPhones} ({$memberCount} total)\n\n";

// Sample members
echo "SAMPLE MEMBERS:\n";
$sampleMembers = Member::where('is_active', true)->limit(5)->get(['id', 'name', 'phone', 'member_code']);
foreach ($sampleMembers as $m) {
    echo "  ID {$m->id}: {$m->name}\n";
    echo "    Phone: " . ($m->phone ?? 'NULL') . "\n";
    echo "    Code: " . ($m->member_code ?? 'NULL') . "\n";
}

echo "\nKEY ISSUES:\n";
echo str_repeat("-", 80) . "\n";
echo "1. MASKED PHONE NUMBERS:\n";
echo "   - Paybill transactions have masked phones: 25471****904\n";
echo "   - Only last 3 digits extracted: ['904']\n";
echo "   - Cannot match with full member phone numbers\n\n";

echo "2. FRAGMENTED PARTICULARS:\n";
echo "   - Old format splits multi-line particulars incorrectly\n";
echo "   - Example: 'MPS 254722216788\\nTD46FSF3QE 0716227320\\nEDWARD MUCH'\n";
echo "   - Becomes 3 separate transactions instead of 1\n";
echo "   - Results in: 'EDWARD MUCH' with no phone/code\n\n";

echo "3. TRANSACTION CODES NOT USED FOR MATCHING:\n";
echo "   - Codes are stored (TJU0H8RH7K, etc.)\n";
echo "   - But matching service only uses phones and names\n";
echo "   - Member codes may not match transaction codes\n\n";

echo "RECOMMENDATIONS:\n";
echo str_repeat("-", 80) . "\n";
echo "1. Fix old format parser to combine multi-line particulars\n";
echo "2. Extract full phone from transaction code or other fields\n";
echo "3. Use transaction codes for matching if available\n";
echo "4. Re-process statements with fixed parser\n";
echo "5. Re-run auto-assignment after re-processing\n";

echo "\n" . str_repeat("=", 80) . "\n";


