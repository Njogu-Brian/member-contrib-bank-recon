<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\ActivityLog;
use App\Models\Setting;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    protected $smsService;

    public function __construct()
    {
        // Inject SmsService only when needed (for sendCredentials method)
        // This prevents errors if SmsService has issues during construction
        try {
            $this->smsService = app(SmsService::class);
        } catch (\Exception $e) {
            Log::warning('SmsService could not be instantiated: ' . $e->getMessage());
            $this->smsService = null;
        }
    }

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
            'send_credentials_sms' => 'boolean',
            'send_credentials_email' => 'boolean',
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
                'must_change_password' => true, // Force password change on first login
                'password_changed_at' => null,
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

            // Send credentials via SMS and/or Email if requested
            $sendSms = $request->boolean('send_credentials_sms', false);
            $sendEmail = $request->boolean('send_credentials_email', false);
            
            if ($sendSms || $sendEmail) {
                $this->sendCredentials($user, $validated['password'], $sendSms, $sendEmail);
            }

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
            'password_reset_at' => now(),
            'must_change_password' => $validated['require_change'] ?? true,
            'password_changed_at' => $validated['require_change'] ?? true ? null : now(),
        ]);

        // Invalidate all existing tokens
        $user->tokens()->delete();

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

    /**
     * Send credentials to existing staff member
     */
    public function sendCredentials(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8',
            'send_sms' => 'boolean',
            'send_email' => 'boolean',
        ]);

        $sendSms = $request->boolean('send_sms', true);
        $sendEmail = $request->boolean('send_email', true);

        $result = $this->sendCredentials($user, $validated['password'], $sendSms, $sendEmail);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'credentials_sent',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => "Sent credentials to staff: {$user->name}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Credentials sent successfully',
            'sms_sent' => $result['sms_sent'] ?? false,
            'email_sent' => $result['email_sent'] ?? false,
        ]);
    }

    /**
     * Send credentials via SMS and/or Email
     */
    protected function sendCredentials(User $user, string $password, bool $sendSms = true, bool $sendEmail = true): array
    {
        $result = ['sms_sent' => false, 'email_sent' => false];
        $appName = Setting::get('app_name', 'Evimeria Portal');
        $appUrl = rtrim(config('app.url', env('APP_URL', 'https://evimeria.breysomsolutions.co.ke')), '/');

        // Prepare SMS message (shorter format for SMS)
        $smsMessage = "Hello {$user->name},\n\n";
        $smsMessage .= "Your {$appName} account:\n";
        $smsMessage .= "Email: {$user->email}\n";
        $smsMessage .= "Password: {$password}\n";
        $smsMessage .= "Login: {$appUrl}/login\n\n";
        $smsMessage .= "Change password on first login.";

        // Prepare Email message (more detailed format)
        $emailMessage = "Hello {$user->name},\n\n";
        $emailMessage .= "Your {$appName} staff account has been created. Below are your login credentials:\n\n";
        $emailMessage .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        $emailMessage .= "ACCOUNT CREDENTIALS\n";
        $emailMessage .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $emailMessage .= "Name: {$user->name}\n";
        $emailMessage .= "Email: {$user->email}\n";
        $emailMessage .= "Password: {$password}\n\n";
        $emailMessage .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        $emailMessage .= "ACCESS PORTAL\n";
        $emailMessage .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $emailMessage .= "Portal URL: {$appUrl}/login\n\n";
        $emailMessage .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        $emailMessage .= "IMPORTANT NOTES\n";
        $emailMessage .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        $emailMessage .= "• Please change your password immediately after your first login.\n";
        $emailMessage .= "• Keep your credentials secure and do not share them with anyone.\n";
        $emailMessage .= "• If you did not request this account, please contact your administrator.\n\n";
        $emailMessage .= "Thank you,\n";
        $emailMessage .= "{$appName} Administration";

        // Send SMS if requested and phone number exists
        if ($sendSms && $user->phone && $this->smsService) {
            try {
                $smsResult = $this->smsService->send($user->phone, $smsMessage);
                $result['sms_sent'] = $smsResult['success'] ?? false;
                if (!$result['sms_sent']) {
                    Log::warning('Failed to send SMS credentials to staff', [
                        'user_id' => $user->id,
                        'phone' => $user->phone,
                        'error' => $smsResult['error'] ?? 'Unknown error',
                    ]);
                } else {
                    Log::info('SMS credentials sent to staff', [
                        'user_id' => $user->id,
                        'phone' => $user->phone,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Error sending SMS credentials to staff', [
                    'user_id' => $user->id,
                    'phone' => $user->phone,
                    'error' => $e->getMessage(),
                ]);
            }
        } elseif ($sendSms && $user->phone && !$this->smsService) {
            Log::warning('SMS requested but SmsService is not available', [
                'user_id' => $user->id,
                'phone' => $user->phone,
            ]);
        }

        // Send Email if requested and email exists
        if ($sendEmail && $user->email) {
            try {
                Mail::raw($emailMessage, function ($mail) use ($user, $appName) {
                    $mail->to($user->email)
                         ->subject("Your {$appName} Staff Account Credentials");
                });
                $result['email_sent'] = true;
                Log::info('Email credentials sent to staff', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                ]);
            } catch (\Exception $e) {
                Log::error('Error sending email credentials to staff', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
                $result['email_sent'] = false;
            }
        }

        return $result;
    }
}

