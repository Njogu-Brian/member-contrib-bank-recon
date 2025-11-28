<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$user = User::where('email', 'testuser@evimeria.test')->first();

if ($user) {
    echo "========================================\n";
    echo "Test User Details:\n";
    echo "========================================\n";
    echo "Email: {$user->email}\n";
    echo "Name: {$user->name}\n";
    echo "must_change_password (raw): " . var_export($user->must_change_password, true) . "\n";
    echo "must_change_password (type): " . gettype($user->must_change_password) . "\n";
    echo "must_change_password (as bool): " . var_export((bool)$user->must_change_password, true) . "\n";
    echo "must_change_password (=== true): " . var_export($user->must_change_password === true, true) . "\n";
    echo "must_change_password (=== 1): " . var_export($user->must_change_password === 1, true) . "\n";
    echo "must_change_password (=== '1'): " . var_export($user->must_change_password === '1', true) . "\n";
    echo "Is Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
    echo "========================================\n";
} else {
    echo "User not found\n";
}

