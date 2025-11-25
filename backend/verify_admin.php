<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$user = User::where('email', 'admin@evimeria.com')->first();

if ($user) {
    echo "✅ Admin User Found:\n";
    echo "   Name: {$user->name}\n";
    echo "   Email: {$user->email}\n";
    echo "   Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
    echo "   Roles: " . $user->roles->pluck('slug')->join(', ') . "\n";
    echo "\n✅ You can now log in with:\n";
    echo "   Email: admin@evimeria.com\n";
    echo "   Password: admin123\n";
} else {
    echo "❌ Admin user not found. Run: php create_admin_user.php\n";
}

