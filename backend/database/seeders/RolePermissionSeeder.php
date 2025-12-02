<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define all permissions by module
        $permissions = [
            // Dashboard
            ['module' => 'dashboard', 'action' => 'view', 'name' => 'View Dashboard', 'slug' => 'dashboard.view'],

            // Members
            ['module' => 'members', 'action' => 'view', 'name' => 'View Members', 'slug' => 'members.view'],
            ['module' => 'members', 'action' => 'create', 'name' => 'Create Members', 'slug' => 'members.create'],
            ['module' => 'members', 'action' => 'update', 'name' => 'Update Members', 'slug' => 'members.update'],
            ['module' => 'members', 'action' => 'delete', 'name' => 'Delete Members', 'slug' => 'members.delete'],
            ['module' => 'members', 'action' => 'manage', 'name' => 'Manage Members', 'slug' => 'members.manage'],

            // Staff
            ['module' => 'staff', 'action' => 'view', 'name' => 'View Staff', 'slug' => 'staff.view'],
            ['module' => 'staff', 'action' => 'create', 'name' => 'Create Staff', 'slug' => 'staff.create'],
            ['module' => 'staff', 'action' => 'update', 'name' => 'Update Staff', 'slug' => 'staff.update'],
            ['module' => 'staff', 'action' => 'delete', 'name' => 'Delete Staff', 'slug' => 'staff.delete'],
            ['module' => 'staff', 'action' => 'manage', 'name' => 'Manage Staff', 'slug' => 'staff.manage'],

            // Contributions
            ['module' => 'contributions', 'action' => 'view', 'name' => 'View Contributions', 'slug' => 'contributions.view'],
            ['module' => 'contributions', 'action' => 'create', 'name' => 'Create Contributions', 'slug' => 'contributions.create'],
            ['module' => 'contributions', 'action' => 'update', 'name' => 'Update Contributions', 'slug' => 'contributions.update'],
            ['module' => 'contributions', 'action' => 'delete', 'name' => 'Delete Contributions', 'slug' => 'contributions.delete'],
            ['module' => 'contributions', 'action' => 'manage', 'name' => 'Manage Contributions', 'slug' => 'contributions.manage'],

            // Payments
            ['module' => 'payments', 'action' => 'view', 'name' => 'View Payments', 'slug' => 'payments.view'],
            ['module' => 'payments', 'action' => 'create', 'name' => 'Create Payments', 'slug' => 'payments.create'],
            ['module' => 'payments', 'action' => 'manage', 'name' => 'Manage Payments', 'slug' => 'payments.manage'],

            // Expenses
            ['module' => 'expenses', 'action' => 'view', 'name' => 'View Expenses', 'slug' => 'expenses.view'],
            ['module' => 'expenses', 'action' => 'create', 'name' => 'Create Expenses', 'slug' => 'expenses.create'],
            ['module' => 'expenses', 'action' => 'update', 'name' => 'Update Expenses', 'slug' => 'expenses.update'],
            ['module' => 'expenses', 'action' => 'delete', 'name' => 'Delete Expenses', 'slug' => 'expenses.delete'],
            ['module' => 'expenses', 'action' => 'manage', 'name' => 'Manage Expenses', 'slug' => 'expenses.manage'],

            // Investments
            ['module' => 'investments', 'action' => 'view', 'name' => 'View Investments', 'slug' => 'investments.view'],
            ['module' => 'investments', 'action' => 'create', 'name' => 'Create Investments', 'slug' => 'investments.create'],
            ['module' => 'investments', 'action' => 'update', 'name' => 'Update Investments', 'slug' => 'investments.update'],
            ['module' => 'investments', 'action' => 'delete', 'name' => 'Delete Investments', 'slug' => 'investments.delete'],
            ['module' => 'investments', 'action' => 'manage', 'name' => 'Manage Investments', 'slug' => 'investments.manage'],

            // Announcements
            ['module' => 'announcements', 'action' => 'view', 'name' => 'View Announcements', 'slug' => 'announcements.view'],
            ['module' => 'announcements', 'action' => 'create', 'name' => 'Create Announcements', 'slug' => 'announcements.create'],
            ['module' => 'announcements', 'action' => 'update', 'name' => 'Update Announcements', 'slug' => 'announcements.update'],
            ['module' => 'announcements', 'action' => 'delete', 'name' => 'Delete Announcements', 'slug' => 'announcements.delete'],
            ['module' => 'announcements', 'action' => 'manage', 'name' => 'Manage Announcements', 'slug' => 'announcements.manage'],

            // Meetings
            ['module' => 'meetings', 'action' => 'view', 'name' => 'View Meetings', 'slug' => 'meetings.view'],
            ['module' => 'meetings', 'action' => 'create', 'name' => 'Create Meetings', 'slug' => 'meetings.create'],
            ['module' => 'meetings', 'action' => 'update', 'name' => 'Update Meetings', 'slug' => 'meetings.update'],
            ['module' => 'meetings', 'action' => 'manage', 'name' => 'Manage Meetings', 'slug' => 'meetings.manage'],

            // Reports
            ['module' => 'reports', 'action' => 'view', 'name' => 'View Reports', 'slug' => 'reports.view'],
            ['module' => 'reports', 'action' => 'export', 'name' => 'Export Reports', 'slug' => 'reports.export'],
            ['module' => 'reports', 'action' => 'manage', 'name' => 'Manage Reports', 'slug' => 'reports.manage'],

            // Settings
            ['module' => 'settings', 'action' => 'view', 'name' => 'View Settings', 'slug' => 'settings.view'],
            ['module' => 'settings', 'action' => 'update', 'name' => 'Update Settings', 'slug' => 'settings.update'],
            ['module' => 'settings', 'action' => 'manage', 'name' => 'Manage Settings', 'slug' => 'settings.manage'],

            // Integrations
            ['module' => 'integrations', 'action' => 'view', 'name' => 'View Integrations', 'slug' => 'integrations.view'],
            ['module' => 'integrations', 'action' => 'manage', 'name' => 'Manage Integrations', 'slug' => 'integrations.manage'],

            // Audit Logs
            ['module' => 'audit_logs', 'action' => 'view', 'name' => 'View Audit Logs', 'slug' => 'audit_logs.view'],

            // Transactions
            ['module' => 'transactions', 'action' => 'view', 'name' => 'View Transactions', 'slug' => 'transactions.view'],
            ['module' => 'transactions', 'action' => 'update', 'name' => 'Update Transactions', 'slug' => 'transactions.update'],
            ['module' => 'transactions', 'action' => 'manage', 'name' => 'Manage Transactions', 'slug' => 'transactions.manage'],

            // Statements
            ['module' => 'statements', 'action' => 'view', 'name' => 'View Statements', 'slug' => 'statements.view'],
            ['module' => 'statements', 'action' => 'create', 'name' => 'Upload Statements', 'slug' => 'statements.create'],
            ['module' => 'statements', 'action' => 'manage', 'name' => 'Manage Statements', 'slug' => 'statements.manage'],

            // SMS
            ['module' => 'sms', 'action' => 'view', 'name' => 'View SMS Logs', 'slug' => 'sms.view'],
            ['module' => 'sms', 'action' => 'create', 'name' => 'Send SMS', 'slug' => 'sms.create'],
            ['module' => 'sms', 'action' => 'manage', 'name' => 'Manage SMS', 'slug' => 'sms.manage'],

            // Wallets
            ['module' => 'wallets', 'action' => 'view', 'name' => 'View Wallets', 'slug' => 'wallets.view'],
            ['module' => 'wallets', 'action' => 'create', 'name' => 'Create Wallets', 'slug' => 'wallets.create'],
            ['module' => 'wallets', 'action' => 'manage', 'name' => 'Manage Wallets', 'slug' => 'wallets.manage'],

            // Budgets
            ['module' => 'budgets', 'action' => 'view', 'name' => 'View Budgets', 'slug' => 'budgets.view'],
            ['module' => 'budgets', 'action' => 'create', 'name' => 'Create Budgets', 'slug' => 'budgets.create'],
            ['module' => 'budgets', 'action' => 'update', 'name' => 'Update Budgets', 'slug' => 'budgets.update'],
            ['module' => 'budgets', 'action' => 'manage', 'name' => 'Manage Budgets', 'slug' => 'budgets.manage'],

            // KYC
            ['module' => 'kyc', 'action' => 'view', 'name' => 'View KYC Documents', 'slug' => 'kyc.view'],
            ['module' => 'kyc', 'action' => 'approve', 'name' => 'Approve/Reject KYC', 'slug' => 'kyc.approve'],
            ['module' => 'kyc', 'action' => 'manage', 'name' => 'Manage KYC', 'slug' => 'kyc.manage'],
        ];

        // Create permissions
        foreach ($permissions as $permissionData) {
            Permission::firstOrCreate(
                ['slug' => $permissionData['slug']],
                $permissionData
            );
        }

        // Define roles and their permissions
        $roles = [
            'super_admin' => [
                'name' => 'Super Admin',
                'description' => 'Full system access',
                'permissions' => '*', // All permissions
            ],
            'admin' => [
                'name' => 'Administrator',
                'description' => 'Administrative access to most features',
                'permissions' => [
                    'dashboard.view',
                    'members.view', 'members.create', 'members.update', 'members.manage',
                    'contributions.view', 'contributions.create', 'contributions.manage',
                    'payments.view', 'payments.manage',
                    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.manage',
                    'investments.view', 'investments.create', 'investments.update', 'investments.manage',
                    'announcements.view', 'announcements.create', 'announcements.update', 'announcements.manage',
                    'meetings.view', 'meetings.create', 'meetings.update', 'meetings.manage',
                    'reports.view', 'reports.export', 'reports.manage',
                    'settings.view', 'settings.update',
                    'integrations.view',
                    'audit_logs.view',
                    'transactions.view', 'transactions.update', 'transactions.manage',
                    'statements.view', 'statements.create', 'statements.manage',
                    'sms.view', 'sms.create', 'sms.manage',
                    'wallets.view', 'wallets.create', 'wallets.manage',
                    'budgets.view', 'budgets.create', 'budgets.update', 'budgets.manage',
                    'kyc.view', 'kyc.approve', 'kyc.manage',
                ],
            ],
            'treasurer' => [
                'name' => 'Treasurer',
                'description' => 'Financial management access',
                'permissions' => [
                    'dashboard.view',
                    'members.view',
                    'contributions.view', 'contributions.create', 'contributions.manage',
                    'payments.view', 'payments.manage',
                    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.manage',
                    'investments.view', 'investments.create', 'investments.update', 'investments.manage',
                    'reports.view', 'reports.export',
                    'transactions.view', 'transactions.update', 'transactions.manage',
                    'statements.view', 'statements.create',
                    'wallets.view', 'wallets.create', 'wallets.manage',
                    'budgets.view', 'budgets.create', 'budgets.update', 'budgets.manage',
                    'kyc.view',
                ],
            ],
            'secretary' => [
                'name' => 'Secretary',
                'description' => 'Administrative and meeting management access',
                'permissions' => [
                    'dashboard.view',
                    'members.view', 'members.create', 'members.update',
                    'announcements.view', 'announcements.create', 'announcements.update', 'announcements.manage',
                    'meetings.view', 'meetings.create', 'meetings.update', 'meetings.manage',
                    'reports.view',
                    'kyc.view', 'kyc.approve',
                ],
            ],
            'group_leader' => [
                'name' => 'Group Leader',
                'description' => 'Can approve expenses and view reports',
                'permissions' => [
                    'dashboard.view',
                    'members.view',
                    'contributions.view',
                    'expenses.view', 'expenses.update', 'expenses.manage',
                    'reports.view',
                    'announcements.view',
                    'meetings.view',
                ],
            ],
            'member' => [
                'name' => 'Member',
                'description' => 'Basic member access',
                'permissions' => [
                    'dashboard.view',
                    'members.view',
                    'investments.view',
                    'announcements.view',
                    'meetings.view',
                ],
            ],
        ];

        // Create roles and assign permissions
        foreach ($roles as $slug => $roleData) {
            $role = Role::firstOrCreate(
                ['slug' => $slug],
                [
                    'name' => $roleData['name'],
                    'description' => $roleData['description'],
                ]
            );

            // Assign permissions
            if ($roleData['permissions'] === '*') {
                // Super admin gets all permissions
                $allPermissions = Permission::all();
                $role->permissions()->sync($allPermissions->pluck('id'));
            } else {
                $permissionIds = Permission::whereIn('slug', $roleData['permissions'])
                    ->pluck('id');
                $role->permissions()->sync($permissionIds);
            }
        }

        $this->command->info('Roles and permissions seeded successfully!');
    }
}
