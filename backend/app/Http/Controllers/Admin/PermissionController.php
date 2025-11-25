<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        $query = Permission::query();

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('module', 'like', "%{$search}%");
            });
        }

        $permissions = $query->orderBy('module')->orderBy('action')->get();

        // Group by module for easier frontend consumption
        $grouped = $permissions->groupBy('module')->map(function ($perms) {
            return $perms->groupBy('action');
        });

        return response()->json([
            'permissions' => $permissions,
            'grouped' => $grouped,
            'modules' => Permission::getModules(),
            'actions' => Permission::getActions(),
        ]);
    }

    public function show(Permission $permission)
    {
        $permission->load('roles');
        return response()->json($permission);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:permissions,slug',
            'module' => 'required|string|max:255',
            'action' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $permission = Permission::create($validated);

        return response()->json($permission, 201);
    }

    public function update(Request $request, Permission $permission)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:permissions,slug,' . $permission->id,
            'module' => 'sometimes|required|string|max:255',
            'action' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $permission->update($validated);

        return response()->json($permission);
    }

    public function destroy(Permission $permission)
    {
        if ($permission->roles()->count() > 0) {
            return response()->json(['message' => 'Cannot delete permission assigned to roles'], 422);
        }

        $permission->delete();

        return response()->json(['message' => 'Permission deleted successfully']);
    }
}

