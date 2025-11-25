<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

// Create admin user
$user = User::firstOrCreate(
    ['email' => 'admin@evimeria.com'],
    [
        'name' => 'Admin User',
        'password' => Hash::make('admin123'),
        'is_active' => true,
    ]
);

// Assign super_admin role
$superAdminRole = Role::where('slug', 'super_admin')->first();
if ($superAdminRole && !$user->roles()->where('slug', 'super_admin')->exists()) {
    $user->roles()->attach($superAdminRole->id);
    echo "Admin user created/updated with super_admin role\n";
    echo "Email: admin@evimeria.com\n";
    echo "Password: admin123\n";
} else {
    echo "Admin user exists but role assignment failed. Please check if roles are seeded.\n";
}

