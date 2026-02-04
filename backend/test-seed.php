<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Role;
use App\Models\Member;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

DB::beginTransaction();
try {
    // Create roles
    $adminRole = Role::firstOrCreate(
        ['slug' => 'admin'],
        ['name' => 'Administrator', 'description' => 'Full system access']
    );
    
    $treasurerRole = Role::firstOrCreate(
        ['slug' => 'treasurer'],
        ['name' => 'Treasurer', 'description' => 'Finance and approvals']
    );

    // Create admin user
    $adminUser = User::firstOrCreate(
        ['email' => 'admin@evimeria.test'],
        [
            'name' => 'System Admin',
            'password' => Hash::make('Password!23'),
            'is_active' => true,
            'terms_accepted' => true,
            'terms_accepted_at' => now(),
            'terms_version' => '1.0',
        ]
    );
    $adminUser->roles()->syncWithoutDetaching([$adminRole->id]);
    
    // Create treasurer user
    $treasurerUser = User::firstOrCreate(
        ['email' => 'treasurer@evimeria.test'],
        [
            'name' => 'Treasurer Jane',
            'password' => Hash::make('Password!23'),
            'is_active' => true,
            'terms_accepted' => true,
            'terms_accepted_at' => now(),
            'terms_version' => '1.0',
        ]
    );
    $treasurerUser->roles()->syncWithoutDetaching([$treasurerRole->id]);
    
    // Create a test member
    $member = Member::firstOrCreate(
        ['email' => 'member@evimeria.test'],
        [
            'name' => 'Test Member',
            'phone' => '254712345678',
            'is_active' => true,
            'kyc_status' => 'approved',
        ]
    );
    
    DB::commit();
    
    echo "✓ Admin user: admin@evimeria.test / Password!23\n";
    echo "✓ Treasurer user: treasurer@evimeria.test / Password!23\n";
    echo "✓ Test member created: {$member->name}\n";
    echo "✓ Seeding completed successfully!\n";
} catch (\Exception $e) {
    DB::rollBack();
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}



