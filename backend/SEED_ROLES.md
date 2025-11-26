# Seed Roles Using Tinker

## Quick Method (Recommended)

Run this command:

```bash
cd backend
php artisan tinker < seed-roles.php
```

## Manual Method

Or run tinker and paste the commands:

```bash
cd backend
php artisan tinker
```

Then paste this:

```php
use App\Models\Role;

$roles = [
    ['name' => 'Super Admin', 'slug' => 'super_admin', 'description' => 'Super Administrator with full system access'],
    ['name' => 'Admin', 'slug' => 'admin', 'description' => 'Administrator with elevated privileges'],
    ['name' => 'Chairman', 'slug' => 'chairman', 'description' => 'Group Chairman with oversight and approval rights'],
    ['name' => 'Secretary', 'slug' => 'secretary', 'description' => 'Group Secretary managing records and communications'],
    ['name' => 'Group Secretary', 'slug' => 'group_secretary', 'description' => 'Group Secretary with extended permissions'],
    ['name' => 'Treasurer', 'slug' => 'treasurer', 'description' => 'Treasurer managing financial transactions and approvals'],
    ['name' => 'Group Treasurer', 'slug' => 'group_treasurer', 'description' => 'Group Treasurer with extended financial permissions'],
    ['name' => 'Accountant', 'slug' => 'accountant', 'description' => 'Accountant managing bookkeeping and reconciliations'],
    ['name' => 'IT & Support', 'slug' => 'it_support', 'description' => 'IT Support staff with system configuration access'],
    ['name' => 'Member', 'slug' => 'member', 'description' => 'Regular member with basic access'],
    ['name' => 'Guest / Auditor', 'slug' => 'guest', 'description' => 'Guest user with read-only access for auditing'],
];

foreach ($roles as $roleData) {
    Role::updateOrCreate(
        ['slug' => $roleData['slug']],
        ['name' => $roleData['name'], 'description' => $roleData['description']]
    );
}

echo "Roles seeded successfully!";
```

## Verify Roles

To check if roles were created:

```php
App\Models\Role::all(['id', 'name', 'slug'])->toArray();
```

## Roles Created

The following roles will be created/updated:

1. **Super Admin** (`super_admin`) - Full system access
2. **Admin** (`admin`) - Elevated privileges  
3. **Chairman** (`chairman`) - Group oversight
4. **Secretary** (`secretary`) - Records management
5. **Group Secretary** (`group_secretary`) - Extended secretary permissions
6. **Treasurer** (`treasurer`) - Financial management
7. **Group Treasurer** (`group_treasurer`) - Extended treasurer permissions
8. **Accountant** (`accountant`) - Bookkeeping
9. **IT & Support** (`it_support`) - System configuration
10. **Member** (`member`) - Basic access
11. **Guest / Auditor** (`guest`) - Read-only access

