<?php

/**
 * Seed Roles using Tinker
 * 
 * Run this with: php artisan tinker < seed-roles.php
 * Or copy-paste the commands into tinker directly
 */

use App\Models\Role;

echo "Seeding roles...\n\n";

$roles = [
    [
        'name' => 'Super Admin',
        'slug' => 'super_admin',
        'description' => 'Super Administrator with full system access',
    ],
    [
        'name' => 'Admin',
        'slug' => 'admin',
        'description' => 'Administrator with elevated privileges',
    ],
    [
        'name' => 'Chairman',
        'slug' => 'chairman',
        'description' => 'Group Chairman with oversight and approval rights',
    ],
    [
        'name' => 'Secretary',
        'slug' => 'secretary',
        'description' => 'Group Secretary managing records and communications',
    ],
    [
        'name' => 'Group Secretary',
        'slug' => 'group_secretary',
        'description' => 'Group Secretary with extended permissions',
    ],
    [
        'name' => 'Treasurer',
        'slug' => 'treasurer',
        'description' => 'Treasurer managing financial transactions and approvals',
    ],
    [
        'name' => 'Group Treasurer',
        'slug' => 'group_treasurer',
        'description' => 'Group Treasurer with extended financial permissions',
    ],
    [
        'name' => 'Accountant',
        'slug' => 'accountant',
        'description' => 'Accountant managing bookkeeping and reconciliations',
    ],
    [
        'name' => 'IT & Support',
        'slug' => 'it_support',
        'description' => 'IT Support staff with system configuration access',
    ],
    [
        'name' => 'Member',
        'slug' => 'member',
        'description' => 'Regular member with basic access',
    ],
    [
        'name' => 'Guest / Auditor',
        'slug' => 'guest',
        'description' => 'Guest user with read-only access for auditing',
    ],
];

$created = 0;
$updated = 0;

foreach ($roles as $roleData) {
    $role = Role::updateOrCreate(
        ['slug' => $roleData['slug']],
        [
            'name' => $roleData['name'],
            'description' => $roleData['description'],
        ]
    );
    
    if ($role->wasRecentlyCreated) {
        echo "✓ Created: {$role->name} ({$role->slug})\n";
        $created++;
    } else {
        echo "↻ Updated: {$role->name} ({$role->slug})\n";
        $updated++;
    }
}

echo "\n==========================================\n";
echo "Summary:\n";
echo "  Created: {$created} roles\n";
echo "  Updated: {$updated} roles\n";
echo "  Total: " . ($created + $updated) . " roles\n";
echo "==========================================\n";

