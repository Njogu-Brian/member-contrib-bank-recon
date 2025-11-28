<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Create a test user with must_change_password = true
$testUser = User::firstOrCreate(
    ['email' => 'testuser@evimeria.test'],
    [
        'name' => 'Test User',
        'password' => Hash::make('TempPassword123!'),
        'must_change_password' => true,
        'is_active' => true,
        'email_verified_at' => now(),
    ]
);

// Ensure must_change_password is set to true
$testUser->must_change_password = true;
$testUser->password_changed_at = null;
$testUser->save();

echo "========================================\n";
echo "Test User Created/Updated:\n";
echo "========================================\n";
echo "Email: {$testUser->email}\n";
echo "Password: TempPassword123!\n";
echo "Name: {$testUser->name}\n";
echo "Must Change Password: " . ($testUser->must_change_password ? 'Yes' : 'No') . "\n";
echo "Is Active: " . ($testUser->is_active ? 'Yes' : 'No') . "\n";
echo "========================================\n";
echo "You can now login with:\n";
echo "Email: {$testUser->email}\n";
echo "Password: TempPassword123!\n";
echo "========================================\n";

