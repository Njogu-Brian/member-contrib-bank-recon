<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use App\Services\MfaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    protected MfaService $mfaService;

    /**
     * Map backend role slugs to the names expected by the frontend RBAC layer.
     */
    protected array $roleSlugMap = [
        'admin' => 'super_admin',
        'treasurer' => 'treasurer',
        'member' => 'member',
    ];

    public function __construct(MfaService $mfaService)
    {
        $this->mfaService = $mfaService;
    }

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

            if (!$user->is_active) {
                return response()->json([
                    'message' => 'Your account has been deactivated.',
                    'errors' => [
                        'email' => ['Your account has been deactivated.'],
                    ],
                ], 422);
            }

            // Check if MFA is enabled and required
            $requireMfa = Setting::get('require_mfa', '0') === '1';
            $userHasMfa = $this->mfaService->isEnabled($user);
            
            // If MFA is required (either globally or per-user), verify code
            if (($requireMfa || $userHasMfa) && $request->filled('mfa_code')) {
                if (!$this->mfaService->verify($user, $request->mfa_code)) {
                    return response()->json([
                        'message' => 'Invalid MFA code.',
                        'errors' => [
                            'mfa_code' => ['Invalid MFA code.'],
                        ],
                        'requires_mfa' => true,
                    ], 422);
                }
            } elseif (($requireMfa || $userHasMfa) && !$request->filled('mfa_code')) {
                // MFA required but code not provided
                return response()->json([
                    'message' => 'MFA code required.',
                    'requires_mfa' => true,
                    'errors' => [
                        'mfa_code' => ['MFA code is required.'],
                    ],
                ], 422);
            }

            // Check if password must be changed (first login or admin reset)
            $mustChangePassword = $user->must_change_password || !$user->password_changed_at;

            // Update last login
            $user->update(['last_login_at' => now()]);

            // Log activity
            \App\Helpers\ActivityLogger::log('login', $user, null, "User {$user->name} logged in");

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'user' => $this->formatUserResponse($user),
                'token' => $token,
                'must_change_password' => $mustChangePassword,
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
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }
        
        return response()->json([
            'user' => $this->formatUserResponse($user),
        ]);
    }

    public function sendPasswordReset(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Don't reveal if email exists
            return response()->json([
                'message' => 'If that email exists, a password reset link has been sent.',
            ]);
        }

        // Generate reset token
        $token = \Illuminate\Support\Str::random(64);
        
        $user->update([
            'password_reset_token' => $token,
            'password_reset_expires_at' => now()->addHours(24),
        ]);

        // Send email
        try {
            \Illuminate\Support\Facades\Mail::send('emails.password-reset', [
                'user' => $user,
                'token' => $token,
                'resetUrl' => config('app.frontend_url', env('APP_URL')) . '/reset-password?token=' . $token . '&email=' . urlencode($user->email),
            ], function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('Password Reset Request - ' . config('app.name'));
            });
        } catch (\Exception $e) {
            Log::error('Failed to send password reset email: ' . $e->getMessage());
            // Continue anyway - token is saved
        }

        return response()->json([
            'message' => 'If that email exists, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)
            ->where('password_reset_token', $request->token)
            ->where('password_reset_expires_at', '>', now())
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'Invalid or expired reset token.',
                'errors' => [
                    'token' => ['Invalid or expired reset token.'],
                ],
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'password_reset_token' => null,
            'password_reset_expires_at' => null,
            'must_change_password' => false,
            'password_changed_at' => now(),
        ]);

        // Invalidate all existing tokens
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password reset successfully. Please login with your new password.',
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        
        // Check if this is a first login (must_change_password is true)
        $isFirstLogin = $user->must_change_password ?? false;
        
        // Log incoming request for debugging
        Log::info('Password change request', [
            'user_id' => $user->id,
            'is_first_login' => $isFirstLogin,
            'has_password' => $request->has('password'),
            'has_password_confirmation' => $request->has('password_confirmation'),
            'has_current_password' => $request->has('current_password'),
        ]);
        
        // Validation rules
        $rules = [
            'password' => 'required|string|min:8',
            'password_confirmation' => 'required|string|same:password',
        ];
        
        // Only require current_password if NOT first login
        if (!$isFirstLogin) {
            $rules['current_password'] = 'required|string';
        }
        
        try {
            $validated = $request->validate($rules);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Password change validation failed', [
                'user_id' => $user->id,
                'errors' => $e->errors(),
            ]);
            throw $e;
        }

        // Only check current password if NOT first login
        if (!$isFirstLogin) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect.',
                    'errors' => [
                        'current_password' => ['Current password is incorrect.'],
                    ],
                ], 422);
            }
        }

        $user->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
            'password_changed_at' => now(),
        ]);

        // Invalidate all existing tokens except current
        $user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->json([
            'message' => 'Password changed successfully.',
            'user' => $this->formatUserResponse($user->fresh()),
        ]);
    }

    /**
     * Get MFA setup QR code
     */
    public function getMfaSetup(Request $request)
    {
        $user = $request->user();
        $qrCode = $this->mfaService->getQrCode($user);
        $secret = $this->mfaService->getSecret($user);
        
        return response()->json([
            'qr_code' => $qrCode,
            'secret' => $secret->secret,
            'manual_entry_key' => chunk_split($secret->secret, 4, ' '),
        ]);
    }

    /**
     * Enable MFA
     */
    public function enableMfa(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();
        
        try {
            $secret = $this->mfaService->enable($user, $request->code);
            
            \App\Helpers\ActivityLogger::log('mfa.enabled', $user, null, "User {$user->name} enabled MFA");
            
            return response()->json([
                'message' => 'MFA enabled successfully',
                'enabled' => true,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Invalid MFA code',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Disable MFA
     */
    public function disableMfa(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();
        
        if (!$this->mfaService->verify($user, $request->code)) {
            return response()->json([
                'message' => 'Invalid MFA code',
                'errors' => [
                    'code' => ['Invalid MFA code.'],
                ],
            ], 422);
        }
        
        $this->mfaService->disable($user);
        
        \App\Helpers\ActivityLogger::log('mfa.disabled', $user, null, "User {$user->name} disabled MFA");
        
        return response()->json([
            'message' => 'MFA disabled successfully',
            'enabled' => false,
        ]);
    }

    /**
     * Verify MFA code (for testing)
     */
    public function verifyMfa(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();
        $valid = $this->mfaService->verify($user, $request->code);
        
        return response()->json([
            'valid' => $valid,
            'message' => $valid ? 'Code is valid' : 'Code is invalid',
        ]);
    }

    protected function formatUserResponse(User $user): array
    {
        try {
            $user->loadMissing(['roles', 'roles.permissions']);

            $roleSlugs = $user->roles
                ->pluck('slug')
                ->map(fn (string $slug) => $this->roleSlugMap[$slug] ?? $slug)
                ->unique()
                ->values()
                ->all();

            $permissions = $user->getAllPermissions()->pluck('slug')->unique()->values()->all();
            
            $mfaEnabled = $this->mfaService->isEnabled($user);

            return array_merge($user->toArray(), [
                'roles' => $roleSlugs,
                'permissions' => $permissions,
                'mfa_enabled' => $mfaEnabled,
            ]);
        } catch (\Exception $e) {
            Log::error('Error formatting user response: ' . $e->getMessage(), [
                'user_id' => $user->id ?? null,
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Return basic user data if relationship loading fails
            return array_merge($user->toArray(), [
                'roles' => [],
                'permissions' => [],
                'mfa_enabled' => false,
            ]);
        }
    }
}

