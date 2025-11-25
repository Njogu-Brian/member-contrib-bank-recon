<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $query = Role::with(['permissions', 'users']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $roles = $query->orderBy('name')->get();

        return response()->json(['data' => $roles]);
    }

    public function show(Role $role)
    {
        $role->load(['permissions', 'users']);
        return response()->json($role);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:roles,slug',
            'description' => 'nullable|string',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        DB::beginTransaction();
        try {
            $role = Role::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'description' => $validated['description'] ?? null,
            ]);

            if (isset($validated['permissions'])) {
                $role->permissions()->attach($validated['permissions']);
            }

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'created',
                'model_type' => Role::class,
                'model_id' => $role->id,
                'description' => "Created role: {$role->name}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            $role->load(['permissions']);

            return response()->json(['data' => $role], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create role', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('roles')->ignore($role->id)],
            'description' => 'nullable|string',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $oldData = $role->toArray();

        DB::beginTransaction();
        try {
            $role->update(array_filter($validated, function ($key) {
                return !in_array($key, ['permissions']);
            }, ARRAY_FILTER_USE_KEY));

            if (isset($validated['permissions'])) {
                $role->permissions()->sync($validated['permissions']);
            }

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'updated',
                'model_type' => Role::class,
                'model_id' => $role->id,
                'changes' => [
                    'old' => $oldData,
                    'new' => $role->fresh()->toArray(),
                ],
                'description' => "Updated role: {$role->name}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            $role->load(['permissions']);

            return response()->json(['data' => $role]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update role', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Role $role)
    {
        if ($role->users()->count() > 0) {
            return response()->json(['message' => 'Cannot delete role with assigned users'], 422);
        }

        $roleName = $role->name;
        $role->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'deleted',
            'model_type' => Role::class,
            'model_id' => $role->id,
            'description' => "Deleted role: {$roleName}",
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return response()->json(['message' => 'Role deleted successfully']);
    }
}

