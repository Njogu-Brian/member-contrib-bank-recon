<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminPortalTest extends TestCase
{
    // Removed RefreshDatabase to prevent database destruction
    // Tests should use a separate test database configured in phpunit.xml

    protected $adminUser;
    protected $superAdminRole;

    protected function setUp(): void
    {
        parent::setUp();
        
        // WARNING: These tests should ONLY run in a separate test database
        // Check database name to prevent accidental data loss
        $dbName = config('database.connections.mysql.database');
        if ($dbName !== 'evimeria_test' && $dbName !== 'test' && !str_contains($dbName, 'test')) {
            $this->markTestSkipped("Tests must run in test database. Current: {$dbName}. Create evimeria_test database first.");
        }
        
        // Create super admin role
        $this->superAdminRole = Role::firstOrCreate(
            ['slug' => 'super_admin'],
            [
                'name' => 'Super Admin',
                'slug' => 'super_admin',
                'description' => 'Full system access',
            ]
        );

        // Create admin user
        $this->adminUser = User::firstOrCreate(
            ['email' => 'admin@test.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password123'),
                'is_active' => true,
            ]
        );

        if (!$this->adminUser->roles()->where('slug', 'super_admin')->exists()) {
            $this->adminUser->roles()->attach($this->superAdminRole->id);
        }
    }

    /** Phase 1: Admin Portal UI - Test API endpoints are accessible */
    public function test_admin_portal_endpoints_are_accessible()
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/admin/staff');

        $response->assertStatus(200);
    }

    /** Phase 2: Staff Management - Test CRUD operations */
    public function test_can_create_staff_member()
    {
        $role = Role::create([
            'name' => 'Accountant',
            'slug' => 'accountant',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/admin/staff', [
                'name' => 'John Doe',
                'email' => 'john@test.com',
                'password' => 'password123',
                'phone' => '254712345678',
                'roles' => [$role->id],
                'is_active' => true,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'john@test.com',
            'name' => 'John Doe',
        ]);
    }

    public function test_can_list_staff_members()
    {
        User::create([
            'name' => 'Staff 1',
            'email' => 'staff1@test.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/admin/staff');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'is_active']
                ]
            ]);
    }

    public function test_can_update_staff_member()
    {
        $staff = User::create([
            'name' => 'Test Staff',
            'email' => 'staff@test.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/admin/admin/staff/{$staff->id}", [
                'name' => 'Updated Name',
                'email' => 'updated@test.com',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'name' => 'Updated Name',
        ]);
    }

    public function test_can_reset_staff_password()
    {
        $staff = User::create([
            'name' => 'Test Staff',
            'email' => 'staff@test.com',
            'password' => Hash::make('oldpassword'),
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/admin/staff/{$staff->id}/reset-password", [
                'password' => 'newpassword123',
            ]);

        $response->assertStatus(200);
        $staff->refresh();
        $this->assertTrue(Hash::check('newpassword123', $staff->password));
    }

    public function test_can_toggle_staff_status()
    {
        $staff = User::create([
            'name' => 'Test Staff',
            'email' => 'staff@test.com',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/admin/staff/{$staff->id}/toggle-status");

        $response->assertStatus(200);
        $staff->refresh();
        $this->assertEquals(0, $staff->is_active); // Database stores as 0/1, not false/true
    }

    public function test_can_delete_staff_member()
    {
        $staff = User::create([
            'name' => 'Test Staff',
            'email' => 'staff@test.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->deleteJson("/api/v1/admin/admin/staff/{$staff->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('users', ['id' => $staff->id]);
    }

    /** Phase 3: Role Management - Test CRUD operations */
    public function test_can_create_role()
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/admin/roles', [
                'name' => 'Treasurer',
                'slug' => 'treasurer',
                'description' => 'Treasurer role',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('roles', [
            'slug' => 'treasurer',
            'name' => 'Treasurer',
        ]);
    }

    public function test_can_list_roles()
    {
        Role::create(['name' => 'Role 1', 'slug' => 'role1']);
        Role::create(['name' => 'Role 2', 'slug' => 'role2']);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/admin/roles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug']
                ]
            ]);
    }

    public function test_can_update_role()
    {
        $role = Role::create([
            'name' => 'Test Role',
            'slug' => 'test_role',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/admin/admin/roles/{$role->id}", [
                'name' => 'Updated Role',
                'description' => 'Updated description',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'name' => 'Updated Role',
        ]);
    }

    public function test_can_assign_permissions_to_role()
    {
        $role = Role::create([
            'name' => 'Test Role',
            'slug' => 'test_role',
        ]);

        $permission1 = Permission::create([
            'name' => 'View Members',
            'slug' => 'members.view',
            'module' => 'members',
            'action' => 'view',
        ]);

        $permission2 = Permission::create([
            'name' => 'Create Members',
            'slug' => 'members.create',
            'module' => 'members',
            'action' => 'create',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/admin/admin/roles/{$role->id}", [
                'permissions' => [$permission1->id, $permission2->id],
            ]);

        $response->assertStatus(200);
        $this->assertEquals(2, $role->fresh()->permissions()->count());
    }

    public function test_can_delete_role()
    {
        $role = Role::create([
            'name' => 'Test Role',
            'slug' => 'test_role',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->deleteJson("/api/v1/admin/admin/roles/{$role->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    /** Phase 3: Permission Management */
    public function test_can_list_permissions()
    {
        Permission::create([
            'name' => 'View Dashboard',
            'slug' => 'dashboard.view',
            'module' => 'dashboard',
            'action' => 'view',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/admin/permissions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'permissions',
                'grouped',
                'modules',
                'actions',
            ]);
    }

    public function test_can_create_permission()
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/admin/permissions', [
                'name' => 'View Reports',
                'slug' => 'reports.view',
                'module' => 'reports',
                'action' => 'view',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('permissions', [
            'slug' => 'reports.view',
        ]);
    }

    /** Phase 4: RBAC - Test permission enforcement */
    public function test_user_with_permission_can_access_resource()
    {
        $role = Role::create([
            'name' => 'Viewer',
            'slug' => 'viewer',
        ]);

        $permission = Permission::create([
            'name' => 'View Members',
            'slug' => 'members.view',
            'module' => 'members',
            'action' => 'view',
        ]);

        $role->permissions()->attach($permission->id);

        $user = User::create([
            'name' => 'Viewer User',
            'email' => 'viewer@test.com',
            'password' => Hash::make('password'),
        ]);

        $user->roles()->attach($role->id);

        $this->assertTrue($user->hasPermission('members.view'));
    }

    public function test_user_without_permission_cannot_access_resource()
    {
        $user = User::create([
            'name' => 'Regular User',
            'email' => 'user@test.com',
            'password' => Hash::make('password'),
        ]);

        $this->assertFalse($user->hasPermission('members.view'));
    }

    /** Phase 5: Activity Logging */
    public function test_activity_logs_are_created()
    {
        $staff = User::create([
            'name' => 'Test Staff',
            'email' => 'staff@test.com',
            'password' => Hash::make('password'),
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/admin/staff/{$staff->id}/toggle-status");

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->adminUser->id,
            'action' => 'deactivated',
            'model_type' => User::class,
            'model_id' => $staff->id,
        ]);
    }

    public function test_can_list_activity_logs()
    {
        ActivityLog::create([
            'user_id' => $this->adminUser->id,
            'action' => 'created',
            'model_type' => User::class,
            'model_id' => 1,
            'description' => 'Test activity',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/admin/activity-logs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'action', 'user', 'description', 'created_at']
                ]
            ]);
    }

    public function test_can_get_activity_statistics()
    {
        ActivityLog::create([
            'user_id' => $this->adminUser->id,
            'action' => 'created',
            'model_type' => User::class,
            'model_id' => 1,
            'description' => 'Test log',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/admin/activity-logs/statistics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total',
                'by_action',
                'by_user',
                'today',
                'this_week',
                'this_month',
            ]);
    }

    /** Phase 5: Admin Settings */
    public function test_can_get_admin_settings()
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/admin/settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'settings',
                'categories',
            ]);
    }

    public function test_can_update_admin_settings()
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson('/api/v1/admin/admin/settings', [
                'settings' => [
                    'app_name' => 'Evimeria System',
                    'sms_enabled' => '1',
                ],
            ]);

        $response->assertStatus(200);
    }

    /** Phase 6: Integration Tests */
    public function test_complete_staff_workflow()
    {
        // Create role
        $role = Role::create([
            'name' => 'Accountant',
            'slug' => 'accountant',
        ]);

        // Create staff
        $createResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/admin/staff', [
                'name' => 'Accountant User',
                'email' => 'accountant@test.com',
                'password' => 'password123',
                'roles' => [$role->id],
            ]);

        $createResponse->assertStatus(201);
        $staffId = $createResponse->json('data.id');

        // Update staff
        $updateResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/admin/admin/staff/{$staffId}", [
                'name' => 'Updated Accountant',
            ]);

        $updateResponse->assertStatus(200);

        // Verify activity log
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'created',
            'model_type' => User::class,
        ]);
    }

    public function test_role_permission_assignment_workflow()
    {
        // Create permissions
        $perm1 = Permission::create([
            'name' => 'View Members',
            'slug' => 'members.view',
            'module' => 'members',
            'action' => 'view',
        ]);

        $perm2 = Permission::create([
            'name' => 'Create Members',
            'slug' => 'members.create',
            'module' => 'members',
            'action' => 'create',
        ]);

        // Create role
        $role = Role::create([
            'name' => 'Member Manager',
            'slug' => 'member_manager',
        ]);

        // Assign permissions
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/admin/admin/roles/{$role->id}", [
                'permissions' => [$perm1->id, $perm2->id],
            ]);

        $response->assertStatus(200);
        $this->assertEquals(2, $role->fresh()->permissions()->count());

        // Create user with role
        $user = User::create([
            'name' => 'Manager',
            'email' => 'manager@test.com',
            'password' => Hash::make('password'),
        ]);

        $user->roles()->attach($role->id);

        // Verify permissions
        $this->assertTrue($user->hasPermission('members.view'));
        $this->assertTrue($user->hasPermission('members.create'));
    }
}

