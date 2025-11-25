<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    /**
     * Map backend role slugs to the names expected by the frontend RBAC layer.
     */
    protected array $roleSlugMap = [
        'admin' => 'super_admin',
        'treasurer' => 'treasurer',
        'member' => 'member',
    ];

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $this->formatUserResponse($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            $user = User::where('email', $request->email)->first();

            if (! $user || ! Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'The provided credentials are incorrect.',
                    'errors' => [
                        'email' => ['The provided credentials are incorrect.'],
                    ],
                ], 422);
            }

            // Update last login
            $user->update(['last_login_at' => now()]);

            // Log activity
            \App\Helpers\ActivityLogger::log('login', $user, null, "User {$user->name} logged in");

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'user' => $this->formatUserResponse($user),
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An error occurred during login.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        return response()->json([
            'user' => $this->formatUserResponse($request->user()),
        ]);
    }

    protected function formatUserResponse(User $user): array
    {
        $user->loadMissing(['roles', 'roles.permissions']);

        $roleSlugs = $user->roles
            ->pluck('slug')
            ->map(fn (string $slug) => $this->roleSlugMap[$slug] ?? $slug)
            ->unique()
            ->values()
            ->all();

        $permissions = $user->getAllPermissions()->pluck('slug')->unique()->values()->all();

        return array_merge($user->toArray(), [
            'roles' => $roleSlugs,
            'permissions' => $permissions,
        ]);
    }
}

