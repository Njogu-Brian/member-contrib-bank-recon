<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Create Roles
        $roles = [
            ['name' => 'Super Admin', 'slug' => 'super_admin', 'description' => 'Full system access'],
            ['name' => 'Chairman', 'slug' => 'chairman', 'description' => 'Chairman of the organization'],
            ['name' => 'Secretary', 'slug' => 'secretary', 'description' => 'Secretary role'],
            ['name' => 'Group Secretary', 'slug' => 'group_secretary', 'description' => 'Group Secretary role'],
            ['name' => 'Treasurer', 'slug' => 'treasurer', 'description' => 'Treasurer role'],
            ['name' => 'Group Treasurer', 'slug' => 'group_treasurer', 'description' => 'Group Treasurer role'],
            ['name' => 'Accountant', 'slug' => 'accountant', 'description' => 'Accountant role'],
            ['name' => 'IT & Technical Support', 'slug' => 'it_support', 'description' => 'IT Support role'],
            ['name' => 'Member', 'slug' => 'member', 'description' => 'Base member role'],
            ['name' => 'Auditor / Read-only', 'slug' => 'auditor', 'description' => 'Read-only access for auditing'],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(
                ['slug' => $roleData['slug']],
                $roleData
            );
        }

        // Create Permissions
        $modules = Permission::getModules();
        $actions = Permission::getActions();

        $permissions = [];
        foreach ($modules as $module) {
            foreach ($actions as $action) {
                $slug = "{$module}.{$action}";
                $name = ucfirst($action) . ' ' . ucfirst(str_replace('_', ' ', $module));
                
                $permissions[] = [
                    'name' => $name,
                    'slug' => $slug,
                    'module' => $module,
                    'action' => $action,
                    'description' => "Permission to {$action} {$module}",
                ];
            }
        }

        foreach ($permissions as $permissionData) {
            Permission::updateOrCreate(
                ['slug' => $permissionData['slug']],
                $permissionData
            );
        }

        // Assign permissions to roles
        $superAdmin = Role::where('slug', 'super_admin')->first();
        if ($superAdmin) {
            $superAdmin->permissions()->sync(Permission::pluck('id'));
        }

        // Assign basic permissions to other roles
        $rolePermissions = [
            'chairman' => [
                'dashboard.view',
                'members.view',
                'reports.view',
                'reports.export',
                'announcements.view',
                'announcements.create',
                'announcements.update',
                'meetings.view',
                'meetings.create',
                'meetings.update',
                'budgets.view',
                'budgets.approve',
            ],
            'secretary' => [
                'dashboard.view',
                'members.view',
                'members.update',
                'announcements.view',
                'announcements.create',
                'announcements.update',
                'meetings.view',
                'meetings.create',
                'meetings.update',
                'sms.view',
                'sms.create',
            ],
            'group_secretary' => [
                'dashboard.view',
                'members.view',
                'announcements.view',
                'announcements.create',
                'meetings.view',
                'meetings.create',
            ],
            'treasurer' => [
                'dashboard.view',
                'members.view',
                'transactions.view',
                'transactions.create',
                'transactions.update',
                'expenses.view',
                'expenses.create',
                'expenses.update',
                'expenses.approve',
                'investments.view',
                'investments.create',
                'investments.update',
                'reports.view',
                'reports.export',
                'wallets.view',
                'wallets.manage',
                'budgets.view',
                'budgets.create',
                'budgets.update',
            ],
            'group_treasurer' => [
                'dashboard.view',
                'members.view',
                'transactions.view',
                'expenses.view',
                'expenses.create',
                'reports.view',
                'wallets.view',
            ],
            'accountant' => [
                'dashboard.view',
                'members.view',
                'transactions.view',
                'transactions.update',
                'expenses.view',
                'expenses.create',
                'expenses.update',
                'reports.view',
                'reports.export',
                'budgets.view',
                'budgets.create',
                'budgets.update',
            ],
            'it_support' => [
                'dashboard.view',
                'settings.view',
                'settings.update',
                'integrations.view',
                'integrations.update',
                'audit_logs.view',
            ],
            'member' => [
                'dashboard.view',
                'members.view',
            ],
            'auditor' => [
                'dashboard.view',
                'members.view',
                'transactions.view',
                'expenses.view',
                'reports.view',
                'audit_logs.view',
            ],
        ];

        foreach ($rolePermissions as $roleSlug => $permissionSlugs) {
            $role = Role::where('slug', $roleSlug)->first();
            if ($role) {
                $permissionIds = Permission::whereIn('slug', $permissionSlugs)->pluck('id');
                $role->permissions()->sync($permissionIds);
            }
        }
    }
}

