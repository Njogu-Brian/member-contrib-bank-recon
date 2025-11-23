<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\KycDocument;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\AuditLogger;
use App\Services\MfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly MfaService $mfaService,
        private readonly AuditLogger $auditLogger
    ) {
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $profile = UserProfile::create([
            'user_id' => $user->id,
            'kyc_status' => 'in_review',
        ]);

        $token = $user->createToken('mobile_auth')->plainTextToken;

        $this->auditLogger->log($user->id, 'user.registered');

        return response()->json([
            'user' => $user,
            'profile' => $profile,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        try {
            $credentials = $request->validate([
                'email' => ['required', 'email'],
                'password' => ['required', 'string'],
            ]);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Invalid credentials.',
                'errors' => $exception->errors(),
            ], 422);
        }

        $user = User::where('email', $credentials['email'])->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.',
                'errors' => ['email' => ['Invalid email or password.']],
            ], 422);
        }

        $token = $user->createToken('mobile_auth')->plainTextToken;

        $this->auditLogger->log($user->id, 'user.login');

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        $this->auditLogger->log($request->user()->id, 'user.logout');

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function profile(Request $request): JsonResponse
    {
        $profile = $request->user()->profile()->firstOrCreate([]);
        return response()->json($profile);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'national_id' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        $profile = $request->user()->profile()->firstOrCreate([]);
        $profile->update($data);

        $this->auditLogger->log($request->user()->id, 'user.profile_updated', $profile, $data);

        return response()->json($profile);
    }

    public function uploadDocument(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_type' => ['required', 'string'],
            'document' => ['required', 'file', 'mimes:jpg,png,pdf'],
        ]);

        $path = $request->file('document')->store('kyc', 'public');

        $document = KycDocument::create([
            'user_id' => $request->user()->id,
            'document_type' => $data['document_type'],
            'file_name' => $request->file('document')->getClientOriginalName(),
            'path' => $path,
            'status' => 'pending',
        ]);

        $this->auditLogger->log($request->user()->id, 'kyc.document_uploaded', $document, $data);

        return response()->json($document, 201);
    }

    public function enableMfa(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $secret = $this->mfaService->enable($request->user(), $data['code']);

        $this->auditLogger->log($request->user()->id, 'mfa.enabled');

        return response()->json($secret);
    }

    public function disableMfa(Request $request): JsonResponse
    {
        $this->mfaService->disable($request->user());
        $this->auditLogger->log($request->user()->id, 'mfa.disabled');

        return response()->json(['status' => 'disabled']);
    }
}

