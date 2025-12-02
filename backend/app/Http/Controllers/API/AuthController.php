<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Investment;
use App\Models\KycDocument;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\AuditLogger;
use App\Services\MfaService;
use Dompdf\Dompdf;
use Dompdf\Options;
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

    public function updateKycProfile(Request $request): JsonResponse
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

    /**
     * Mobile: Get full profile with member data
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load('member', 'profile');
        
        // Get member data for KYC pre-fill
        $member = $user->member;
        $memberData = null;
        if ($member) {
            // Get national ID from profile table (where it's stored)
            $nationalId = null;
            $profile = $user->profile;
            if ($profile && $profile->national_id) {
                $nationalId = $profile->national_id;
            }
            
            $memberData = [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'phone' => $member->phone,
                'secondary_phone' => $member->secondary_phone,
                'profile_photo_path' => $member->profile_photo_path,
                'member_code' => $member->member_code,
                'member_number' => $member->member_number,
                'gender' => $member->gender,
                'next_of_kin_name' => $member->next_of_kin_name,
                'next_of_kin_phone' => $member->next_of_kin_phone,
                'next_of_kin_relationship' => $member->next_of_kin_relationship,
                'national_id' => $nationalId, // For KYC pre-fill - from profile table
            ];
        }
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'profile_photo_path' => $user->profile_photo_path,
                'member_id' => $user->member_id,
            ],
            'member' => $memberData,
            'profile' => $user->profile,
        ]);
    }

    /**
     * Mobile: Update profile (bio data)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:255'],
            'secondary_phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
            'national_id' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'in:male,female,other'],
            'next_of_kin_name' => ['nullable', 'string', 'max:255'],
            'next_of_kin_phone' => ['nullable', 'string', 'max:255'],
            'next_of_kin_relationship' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        
        // Update user
        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['phone'])) {
            $user->phone = $data['phone'];
        }
        $user->save();

        // Update member if exists
        if ($user->member) {
            if (isset($data['name'])) {
                $user->member->name = $data['name'];
            }
            if (isset($data['phone'])) {
                $user->member->phone = $data['phone'];
            }
            if (isset($data['secondary_phone'])) {
                $user->member->secondary_phone = $data['secondary_phone'];
            }
            if (isset($data['gender'])) {
                $user->member->gender = $data['gender'];
            }
            if (isset($data['next_of_kin_name'])) {
                $user->member->next_of_kin_name = $data['next_of_kin_name'];
            }
            if (isset($data['next_of_kin_phone'])) {
                $user->member->next_of_kin_phone = $data['next_of_kin_phone'];
            }
            if (isset($data['next_of_kin_relationship'])) {
                $user->member->next_of_kin_relationship = $data['next_of_kin_relationship'];
            }
            $user->member->save();
        }

        // Update profile
        $profile = $user->profile()->firstOrCreate([]);
        $profile->update(array_filter([
            'address' => $data['address'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'national_id' => $data['national_id'] ?? null,
        ]));

        $this->auditLogger->log($user->id, 'user.profile_updated', $profile, $data);

        return response()->json([
            'user' => $user->fresh(),
            'member' => $user->member?->fresh(),
            'profile' => $profile->fresh(),
        ]);
    }

    /**
     * Mobile: Upload profile photo
     */
    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:5120'], // 5MB max
        ]);

        $user = $request->user();
        $path = $request->file('photo')->store('profile-photos', 'public');

        // Update user
        $user->profile_photo_path = $path;
        $user->save();

        // Update member if exists
        if ($user->member) {
            $user->member->profile_photo_path = $path;
            $user->member->save();
        }

        $this->auditLogger->log($user->id, 'user.profile_photo_uploaded');

        return response()->json([
            'profile_photo_path' => $path,
            'profile_photo_url' => asset('storage/' . $path),
        ]);
    }

    /**
     * Mobile: Get MFA setup (QR code)
     */
    public function getMfaSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        $setup = $this->mfaService->getSetup($user);

        return response()->json($setup);
    }

    /**
     * Mobile: Verify MFA code during setup
     */
    public function verifyMfa(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();
        $isValid = $this->mfaService->verify($user, $data['code']);

        return response()->json([
            'valid' => $isValid,
            'message' => $isValid ? 'MFA code verified successfully' : 'Invalid MFA code',
        ]);
    }

    /**
     * Mobile: Upload KYC Front ID
     */
    public function uploadFrontId(Request $request): JsonResponse
    {
        return $this->uploadKycDocument($request, 'front_id');
    }

    /**
     * Mobile: Upload KYC Back ID
     */
    public function uploadBackId(Request $request): JsonResponse
    {
        return $this->uploadKycDocument($request, 'back_id');
    }

    /**
     * Mobile: Upload KRA PIN
     */
    public function uploadKraPin(Request $request): JsonResponse
    {
        return $this->uploadKycDocument($request, 'kra_pin');
    }

    /**
     * Mobile: Upload KYC Profile Photo (linked to profile)
     */
    public function uploadKycProfilePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:5120'],
        ]);

        $user = $request->user();
        
        // Upload as KYC document
        $path = $request->file('photo')->store('kyc', 'public');
        $document = KycDocument::create([
            'user_id' => $user->id,
            'member_id' => $user->member_id,
            'document_type' => 'profile_photo',
            'file_name' => $request->file('photo')->getClientOriginalName(),
            'path' => $path,
            'status' => 'pending',
        ]);

        // Also update profile photo
        $user->profile_photo_path = $path;
        $user->save();
        if ($user->member) {
            $user->member->profile_photo_path = $path;
            $user->member->save();
        }

        $this->auditLogger->log($user->id, 'kyc.profile_photo_uploaded', $document);

        return response()->json([
            'document' => $document,
            'profile_photo_path' => $path,
            'profile_photo_url' => asset('storage/' . $path),
        ], 201);
    }

    /**
     * Helper: Upload KYC document
     */
    private function uploadKycDocument(Request $request, string $documentType): JsonResponse
    {
        $request->validate([
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $path = $request->file('document')->store('kyc', 'public');

        $document = KycDocument::create([
            'user_id' => $request->user()->id,
            'member_id' => $request->user()->member_id,
            'document_type' => $documentType,
            'file_name' => $request->file('document')->getClientOriginalName(),
            'path' => $path,
            'status' => 'pending',
        ]);

        $this->auditLogger->log($request->user()->id, 'kyc.document_uploaded', $document, ['type' => $documentType]);

        return response()->json($document, 201);
    }

    /**
     * Mobile: Download investment report
     */
    public function downloadInvestmentReport(Request $request)
    {
        $user = $request->user();
        $member = $user->member;
        
        if (!$member) {
            return response()->json(['message' => 'No member associated with this user'], 404);
        }

        // Get investments for member
        $investments = Investment::where('member_id', $member->id)
            ->with('member')
            ->orderBy('investment_date', 'desc')
            ->get();

        // Generate PDF report
        $html = view('exports.member_investment_report', [
            'member' => $member,
            'investments' => $investments,
            'generatedAt' => now(),
        ])->render();

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        $filename = 'investment-report-' . $member->id . '-' . now()->format('Ymd_His') . '.pdf';
        
        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Mobile: Download statement report
     */
    public function downloadStatementReport(Request $request)
    {
        $user = $request->user();
        $member = $user->member;
        
        if (!$member) {
            return response()->json(['message' => 'No member associated with this user'], 404);
        }

        // Redirect to existing member statement export endpoint
        return redirect()->route('api.v1.members.statement.export', [
            'member' => $member->id,
            'format' => $request->get('format', 'pdf'),
        ]);
    }
}

