<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Member;
use Illuminate\Support\Facades\Hash;

// Find Brian Njogu
$member = Member::where('name', 'LIKE', '%Brian%')
    ->orWhere('name', 'LIKE', '%Njogu%')
    ->first();

if (!$member) {
    echo "❌ Member 'Brian Njogu' not found. Listing all members:\n";
    Member::select('id', 'name', 'email')->limit(20)->get()->each(function($m) {
        echo "  {$m->id}: {$m->name} ({$m->email})\n";
    });
    exit(1);
}

echo "✅ Found member: {$member->name} (ID: {$member->id}, Email: {$member->email})\n";

// Check if user already exists
$existingUser = User::where('email', 'mobiletest@evimeria.test')->first();
if ($existingUser) {
    echo "⚠️  User with email 'mobiletest@evimeria.test' already exists (ID: {$existingUser->id})\n";
    echo "   Updating to link to member...\n";
    $existingUser->member_id = $member->id;
    $existingUser->name = $member->name;
    $existingUser->password = Hash::make('TestPassword123!');
    $existingUser->email_verified_at = now();
    $existingUser->is_active = true;
    $existingUser->save();
    echo "✅ User updated successfully!\n";
} else {
    // Create new user
    $user = User::create([
        'name' => $member->name,
        'email' => 'mobiletest@evimeria.test',
        'password' => Hash::make('TestPassword123!'),
        'member_id' => $member->id,
        'email_verified_at' => now(),
        'is_active' => true,
    ]);
    echo "✅ User created successfully! (ID: {$user->id})\n";
}

// Verify
$user = User::where('email', 'mobiletest@evimeria.test')->with('member.wallet')->first();
echo "\n📋 Verification:\n";
echo "   User: {$user->name} (ID: {$user->id})\n";
echo "   Email: {$user->email}\n";
echo "   Member: {$user->member->name} (ID: {$user->member->id})\n";
if ($user->member->wallet) {
    echo "   Wallet Balance: {$user->member->wallet->balance} {$user->member->wallet->currency}\n";
    echo "   Contributions: " . $user->member->wallet->contributions()->count() . "\n";
}

echo "\n✅ Login credentials:\n";
echo "   Email: mobiletest@evimeria.test\n";
echo "   Password: TestPassword123!\n";

