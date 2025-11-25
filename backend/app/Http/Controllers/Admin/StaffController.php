<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['roles']);
        
        // Only load member relationship if it exists
        if (method_exists(User::class, 'member')) {
            $query->with('member');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('slug', $request->role);
            });
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $perPage = $request->get('per_page', 25);
        $staff = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $staff->items(),
            'current_page' => $staff->currentPage(),
            'last_page' => $staff->lastPage(),
            'per_page' => $staff->perPage(),
            'total' => $staff->total(),
        ]);
    }

    public function show(User $user)
    {
        $user->load(['roles']);
        
        if (method_exists(User::class, 'member')) {
            $user->load('member');
        }
        
        if (method_exists(User::class, 'activityLogs')) {
            $user->load(['activityLogs' => function ($query) {
                $query->latest()->limit(20);
            }]);
        }

        return response()->json(['data' => $user]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
            'member_id' => 'nullable|exists:members,id',
            'roles' => 'required|array|min:1',
            'roles.*' => 'exists:roles,id',
            'is_active' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'phone' => $validated['phone'] ?? null,
                'member_id' => $validated['member_id'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $user->roles()->attach($validated['roles']);

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'created',
                'model_type' => User::class,
                'model_id' => $user->id,
                'description' => "Created staff user: {$user->name}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            $user->load(['roles']);
            if (method_exists(User::class, 'member')) {
                $user->load('member');
            }

            return response()->json(['data' => $user], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create staff user', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'member_id' => 'nullable|exists:members,id',
            'roles' => 'sometimes|array|min:1',
            'roles.*' => 'exists:roles,id',
            'is_active' => 'sometimes|boolean',
        ]);

        $oldData = $user->toArray();

        DB::beginTransaction();
        try {
            $user->update(array_filter($validated, function ($key) {
                return !in_array($key, ['roles']);
            }, ARRAY_FILTER_USE_KEY));

            if (isset($validated['roles'])) {
                $user->roles()->sync($validated['roles']);
            }

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'updated',
                'model_type' => User::class,
                'model_id' => $user->id,
                'changes' => [
                    'old' => $oldData,
                    'new' => $user->fresh()->toArray(),
                ],
                'description' => "Updated staff user: {$user->name}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            $user->load(['roles']);
            if (method_exists(User::class, 'member')) {
                $user->load('member');
            }

            return response()->json(['data' => $user]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update staff user', 'error' => $e->getMessage()], 500);
        }
    }

    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8',
            'require_change' => 'boolean',
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
            'password_reset_at' => $validated['require_change'] ?? false ? now() : null,
        ]);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'password_reset',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => "Password reset for: {$user->name}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Password reset successfully']);
    }

    public function toggleStatus(Request $request, User $user)
    {
        $oldStatus = $user->is_active;
        $user->update(['is_active' => !$user->is_active]);
        $newStatus = $user->is_active;

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => $newStatus ? 'activated' : 'deactivated',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => ($newStatus ? 'Activated' : 'Deactivated') . " staff user: {$user->name}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $user->load(['roles']);
        if (method_exists(User::class, 'member')) {
            $user->load('member');
        }
        
        $statusText = $newStatus ? 'activated' : 'deactivated';
        
        return response()->json([
            'message' => "User {$statusText} successfully",
            'data' => $user,
        ]);
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete your own account'], 422);
        }

        $userName = $user->name;
        $user->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'deleted',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => "Deleted staff user: {$userName}",
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return response()->json(['message' => 'Staff user deleted successfully']);
    }
}

