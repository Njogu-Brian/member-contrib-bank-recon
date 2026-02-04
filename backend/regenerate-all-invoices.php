<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Invoice;
use App\Models\Member;
use App\Models\Setting;
use Carbon\Carbon;

echo "🔄 Regenerating All Invoice Types Locally\n";
echo str_repeat("=", 60) . "\n\n";

$weeklyAmount = (float) Setting::get('weekly_contribution_amount', 1000);
$invoiceStartDate = Setting::get('contribution_start_date');

if (!$invoiceStartDate) {
    echo "❌ Error: Invoice start date (contribution_start_date) not set in settings.\n";
    exit(1);
}

$startDate = Carbon::parse($invoiceStartDate);
$currentDate = Carbon::now();
$currentWeek = $currentDate->format('Y-\WW');
$currentWeekStart = $currentDate->startOfWeek();

echo "📅 Start Date: {$startDate->format('M d, Y')}\n";
echo "📅 Current Week: {$currentWeek} ({$currentWeekStart->format('M d')} - {$currentDate->endOfWeek()->format('M d, Y')})\n\n";

// 1. Generate Weekly Invoices
echo "1️⃣ Generating Weekly Invoices...\n";
$members = Member::where('is_active', true)->get();
$weeklyGenerated = 0;

// Generate for current week
foreach ($members as $member) {
    $exists = Invoice::where('member_id', $member->id)
        ->where('period', $currentWeek)
        ->where('invoice_type', Invoice::TYPE_WEEKLY)
        ->exists();
    
    if (!$exists) {
        Invoice::create([
            'member_id' => $member->id,
            'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_WEEKLY, $currentWeekStart),
            'amount' => $weeklyAmount,
            'due_date' => $currentDate->endOfWeek(),
            'issue_date' => $currentWeekStart,
            'status' => 'pending',
            'period' => $currentWeek,
            'invoice_type' => Invoice::TYPE_WEEKLY,
            'description' => "Weekly contribution for week {$currentWeek}",
        ]);
        $weeklyGenerated++;
    }
}
echo "   ✅ Generated {$weeklyGenerated} weekly invoices for current week\n\n";

// 2. Generate Registration Fees
echo "2️⃣ Generating Registration Fees...\n";
$registrationAmount = (float) Setting::get('registration_fee_amount', 1000);
$regGenerated = 0;
$regSkipped = 0;

foreach ($members as $member) {
    $exists = Invoice::where('member_id', $member->id)
        ->where('invoice_type', Invoice::TYPE_REGISTRATION)
        ->exists();
    
    if ($exists) {
        $regSkipped++;
        continue;
    }
    
    $registrationDate = $member->date_of_registration ?? $member->created_at;
    
    Invoice::create([
        'member_id' => $member->id,
        'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_REGISTRATION, $registrationDate),
        'amount' => $registrationAmount,
        'issue_date' => $registrationDate,
        'due_date' => $registrationDate->copy()->addDays(30),
        'status' => 'pending',
        'period' => 'REG-' . $registrationDate->format('Y'),
        'invoice_type' => Invoice::TYPE_REGISTRATION,
        'description' => 'One-time registration fee',
    ]);
    $regGenerated++;
}
echo "   ✅ Generated {$regGenerated} registration fee invoices\n";
echo "   ⏭️  Skipped {$regSkipped} (already exist)\n\n";

// 3. Generate Annual Subscriptions
echo "3️⃣ Generating Annual Subscriptions...\n";
$annualAmount = (float) Setting::get('annual_subscription_amount', 1000);
$currentYear = $currentDate->year;
$annualGenerated = 0;
$annualSkipped = 0;

foreach ($members as $member) {
    $registrationDate = $member->date_of_registration ?? $member->created_at;
    $registrationYear = $registrationDate->year;
    
    // Check if annual invoice exists for this year
    $exists = Invoice::where('member_id', $member->id)
        ->where('invoice_type', Invoice::TYPE_ANNUAL)
        ->where('invoice_year', $currentYear)
        ->exists();
    
    if ($exists) {
        $annualSkipped++;
        continue;
    }
    
    $issueDate = Carbon::create($currentYear, 1, 1);
    
    Invoice::create([
        'member_id' => $member->id,
        'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_ANNUAL, $issueDate),
        'amount' => $annualAmount,
        'issue_date' => $issueDate,
        'due_date' => $issueDate->copy()->addDays(30),
        'status' => 'pending',
        'period' => "ANNUAL-{$currentYear}",
        'invoice_type' => Invoice::TYPE_ANNUAL,
        'invoice_year' => $currentYear,
        'description' => "Annual subscription for {$currentYear}",
    ]);
    $annualGenerated++;
}
echo "   ✅ Generated {$annualGenerated} annual subscription invoices for {$currentYear}\n";
echo "   ⏭️  Skipped {$annualSkipped} (already exist)\n\n";

// 4. Generate Software Acquisition
echo "4️⃣ Generating Software Acquisition Invoices...\n";
$softwareAmount = (float) Setting::get('software_acquisition_amount', 1000);
$softwareGenerated = 0;
$softwareSkipped = 0;

foreach ($members as $member) {
    $exists = Invoice::where('member_id', $member->id)
        ->where('invoice_type', Invoice::TYPE_SOFTWARE)
        ->exists();
    
    if ($exists) {
        $softwareSkipped++;
        continue;
    }
    
    $chargeDate = Carbon::now();
    $dueDate = $chargeDate->copy()->addDays(30);
    
    Invoice::create([
        'member_id' => $member->id,
        'invoice_number' => Invoice::generateInvoiceNumber(Invoice::TYPE_SOFTWARE, $chargeDate),
        'amount' => $softwareAmount,
        'issue_date' => $chargeDate,
        'due_date' => $dueDate,
        'status' => 'pending',
        'period' => 'SOFTWARE-2025',
        'invoice_type' => Invoice::TYPE_SOFTWARE,
        'description' => 'Software development & acquisition cost',
    ]);
    $softwareGenerated++;
}
echo "   ✅ Generated {$softwareGenerated} software acquisition invoices\n";
echo "   ⏭️  Skipped {$softwareSkipped} (already exist)\n\n";

// Summary
echo str_repeat("=", 60) . "\n";
echo "📊 SUMMARY\n";
echo str_repeat("=", 60) . "\n";
echo "Weekly Invoices:        {$weeklyGenerated}\n";
echo "Registration Fees:      {$regGenerated}\n";
echo "Annual Subscriptions:   {$annualGenerated}\n";
echo "Software Acquisition:   {$softwareGenerated}\n";
echo "\n✅ All invoice types regenerated successfully!\n";

