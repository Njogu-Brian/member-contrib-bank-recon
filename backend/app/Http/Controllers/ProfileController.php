<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\KycDocument;
use App\Services\DocumentValidationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function __construct(
        private readonly DocumentValidationService $validationService
    ) {
    }

    /**
     * Check member profile completion status
     */
    public function checkProfileStatus($token)
    {
        // Rate limiting: max 30 requests per minute per IP
        $key = 'profile-status:' . request()->ip() . ':' . $token;
        if (RateLimiter::tooManyAttempts($key, 30)) {
            return response()->json([
                'error' => 'Too many requests',
                'message' => 'Please wait a moment before trying again.',
            ], 429);
        }
        RateLimiter::hit($key, 60); // 1 minute window

        // Cache profile status for 5 minutes to reduce database load
        $cacheKey = 'profile-status:' . $token;
        $data = Cache::remember($cacheKey, 300, function () use ($token) {
            $member = Member::where('public_share_token', $token)->firstOrFail();

            // Get member data with pending changes applied
            $memberData = [
                'name' => $member->name,
                'phone' => $member->phone,
                'whatsapp_number' => $member->whatsapp_number,
                'email' => $member->email,
                'id_number' => $member->id_number,
                'church' => $member->church,
                'next_of_kin_name' => $member->next_of_kin_name,
                'next_of_kin_phone' => $member->next_of_kin_phone,
                'next_of_kin_relationship' => $member->next_of_kin_relationship,
            ];

            // Override with pending values
            $pendingChanges = \App\Models\PendingProfileChange::where('member_id', $member->id)
                ->where('status', 'pending')
                ->get();
            
            foreach ($pendingChanges as $change) {
                if (isset($memberData[$change->field_name])) {
                    $memberData[$change->field_name] = $change->new_value;
                }
            }

            return [
                'is_complete' => $member->isProfileCompleteWithPending(),
                'missing_fields' => $member->getMissingProfileFields(),
                'profile_completed_at' => $member->profile_completed_at,
                'member' => array_merge($memberData, [
                    'member_code' => $member->member_code,
                    'member_number' => $member->member_number,
                ]),
            ];
        });

        return response()->json($data);
    }

    /**
     * Check if a field value is duplicate (public endpoint)
     */
    public function checkDuplicate(Request $request, $token)
    {
        $request->validate([
            'field' => 'required|string|in:phone,whatsapp_number,id_number',
            'value' => 'required|string',
        ]);

        $member = Member::where('public_share_token', $token)->firstOrFail();
        $field = $request->field;
        $value = $request->value;

        // Format phone numbers to match database format
        if (in_array($field, ['phone', 'whatsapp_number']) && $value) {
            // Remove spaces and ensure + prefix
            $cleaned = str_replace([' ', '-', '(', ')'], '', $value);
            if (substr($cleaned, 0, 1) !== '+') {
                if (substr($cleaned, 0, 3) === '254') {
                    $value = '+' . $cleaned;
                } elseif (substr($cleaned, 0, 1) === '0') {
                    $value = '+254' . substr($cleaned, 1);
                } else {
                    $value = '+254' . $cleaned;
                }
            } else {
                $value = $cleaned;
            }
        }

        $query = Member::where($field, $value);
        
        // Exclude current member
        $query->where('id', '!=', $member->id);

        $exists = $query->exists();

        if ($exists) {
            // Don't reveal other members' information for security/privacy
            $fieldLabels = [
                'phone' => 'phone number',
                'whatsapp_number' => 'WhatsApp number',
                'id_number' => 'ID number',
            ];
            $fieldLabel = $fieldLabels[$field] ?? $field;
            
            return response()->json([
                'is_duplicate' => true,
                'message' => "This {$fieldLabel} is already registered to another member.",
            ]);
        }

        return response()->json([
            'is_duplicate' => false,
            'message' => 'Available',
        ]);
    }

    /**
     * Update member profile
     */
    public function updateProfile(Request $request, $token)
    {
        // Rate limiting: max 10 update attempts per hour per IP
        $key = 'profile-update:' . $request->ip() . ':' . $token;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json([
                'error' => 'Too many update attempts',
                'message' => 'Please wait before trying again.',
            ], 429);
        }
        RateLimiter::hit($key, 3600); // 1 hour window

        $member = Member::where('public_share_token', $token)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+254[17]\d{8}$/', 'unique:members,phone,' . $member->id],
            'whatsapp_number' => ['nullable', 'string', 'max:20', 'regex:/^\+254[17]\d{8}$/', 'unique:members,whatsapp_number,' . $member->id],
            'email' => 'required|email|max:255',
            'id_number' => ['required', 'string', 'regex:/^\d+$/', 'min:5', 'max:20', 'unique:members,id_number,' . $member->id],
            'church' => 'required|string|max:255',
            'next_of_kin_name' => 'required|string|max:255',
            'next_of_kin_phone' => ['required', 'string', 'max:20', 'regex:/^\+254[17]\d{8}$/'],
            'next_of_kin_relationship' => 'required|string|max:255|in:wife,husband,brother,sister,father,mother,son,daughter,cousin,friend,other',
        ], [
            'phone.regex' => 'Phone number must be a valid Kenyan number starting with +2547 or +2541 followed by 8 digits (e.g., +254712345678)',
            'phone.unique' => 'This phone number is already registered to another member.',
            'whatsapp_number.regex' => 'WhatsApp number must be a valid Kenyan number starting with +2547 or +2541 followed by 8 digits',
            'whatsapp_number.unique' => 'This WhatsApp number is already registered to another member.',
            'next_of_kin_name.required' => 'Next of kin name is required',
            'next_of_kin_phone.required' => 'Next of kin phone number is required',
            'next_of_kin_phone.regex' => 'Next of kin phone number must be a valid Kenyan number starting with +2547 or +2541 followed by 8 digits',
            'next_of_kin_relationship.required' => 'Next of kin relationship is required',
            'id_number.regex' => 'ID Number must contain only digits',
            'id_number.min' => 'ID Number must be at least 5 digits',
            'id_number.unique' => 'This ID number is already registered to another member.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Store changes as pending instead of directly updating
        $fieldsToUpdate = [
            'name' => $request->name,
            'phone' => $request->phone,
            'whatsapp_number' => $request->whatsapp_number,
            'email' => $request->email,
            'id_number' => $request->id_number,
            'church' => $request->church,
            'next_of_kin_name' => $request->next_of_kin_name,
            'next_of_kin_phone' => $request->next_of_kin_phone,
            'next_of_kin_relationship' => $request->next_of_kin_relationship,
        ];

        // Check if this is first-time profile completion or an edit
        $isFirstUpdate = !$member->profile_completed_at;
        
        // For first-time updates: check uniqueness and auto-approve if valid
        // For edits: use pending approval system
        if ($isFirstUpdate) {
            // First-time update: Check uniqueness for ID, phone, and WhatsApp
            $uniqueFields = ['id_number', 'phone', 'whatsapp_number'];
            $duplicateErrors = [];
            
            foreach ($uniqueFields as $field) {
                $value = $fieldsToUpdate[$field] ?? null;
                if (!empty($value)) {
                    $existingMember = Member::where($field, $value)
                        ->where('id', '!=', $member->id)
                        ->first();
                    
                    if ($existingMember) {
                        $fieldLabels = [
                            'id_number' => 'ID number',
                            'phone' => 'phone number',
                            'whatsapp_number' => 'WhatsApp number',
                        ];
                        $fieldLabel = $fieldLabels[$field] ?? $field;
                        $duplicateErrors[] = "This {$fieldLabel} ({$value}) is already registered to another member ({$existingMember->name}).";
                    }
                }
            }
            
            if (!empty($duplicateErrors)) {
                return response()->json([
                    'message' => 'Cannot complete profile: ' . implode(' ', $duplicateErrors),
                    'errors' => ['duplicate' => $duplicateErrors],
                ], 422);
            }
            
            // No duplicates - auto-approve and update directly
            DB::beginTransaction();
            try {
                foreach ($fieldsToUpdate as $field => $newValue) {
                    $member->$field = $newValue;
                }
                
                // Mark profile as complete
                if ($member->isProfileComplete()) {
                    $member->markProfileComplete();
                }
                
                $member->save();
                DB::commit();
                
                // Clear cached profile status
                Cache::forget('profile-status:' . $token);
                
                return response()->json([
                    'message' => 'Profile completed successfully.',
                    'auto_approved' => true,
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                \Illuminate\Support\Facades\Log::error('Error updating profile: ' . $e->getMessage());
                return response()->json([
                    'message' => 'Error updating profile',
                    'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
                ], 500);
            }
        } else {
            // Edit from statement view: Use pending approval system
            $tableExists = Schema::hasTable('pending_profile_changes');
            
            if (!$tableExists) {
                \Illuminate\Support\Facades\Log::error('pending_profile_changes table does not exist. Please run migration: php artisan migrate --path=database/migrations/2025_12_06_121926_create_pending_profile_changes_table.php');
                return response()->json([
                    'message' => 'System configuration error. Please contact administrator.',
                    'error' => 'Database table missing. Migration required.',
                ], 500);
            }

            $pendingChanges = [];
            foreach ($fieldsToUpdate as $field => $newValue) {
                $oldValue = $member->$field;
                // Only create pending change if value actually changed
                if ($oldValue != $newValue) {
                    // Delete any existing pending changes for this field
                    \App\Models\PendingProfileChange::where('member_id', $member->id)
                        ->where('field_name', $field)
                        ->where('status', 'pending')
                        ->delete();

                    $pendingChanges[] = \App\Models\PendingProfileChange::create([
                        'member_id' => $member->id,
                        'field_name' => $field,
                        'old_value' => $oldValue,
                        'new_value' => $newValue,
                        'status' => 'pending',
                    ]);
                }
            }

            // Clear cached profile status
            Cache::forget('profile-status:' . $token);

            return response()->json([
                'message' => count($pendingChanges) > 0 
                    ? 'Profile changes submitted for admin approval.'
                    : 'No changes detected.',
                'pending_changes_count' => count($pendingChanges),
                'pending' => true,
            ]);
        }
    }

    /**
     * Upload KYC document (ID front, ID back, or selfie)
     * Public endpoint for members using their token
     */
    public function uploadKycDocument(Request $request, $token)
    {
        // Rate limiting: max 5 uploads per hour per IP
        $key = 'kyc-upload:' . $request->ip() . ':' . $token;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'error' => 'Too many upload attempts',
                'message' => 'Please wait before uploading again.',
            ], 429);
        }
        RateLimiter::hit($key, 3600); // 1 hour window

        $member = Member::where('public_share_token', $token)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'document_type' => 'required|string|in:front_id,back_id,selfie',
            'document' => 'required|file|mimes:jpg,jpeg,png|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $documentType = $request->document_type;
        $file = $request->file('document');

        // Validate document
        $validationResults = $this->validationService->validateDocument($file, $documentType);

        // Check if validation passed
        $hasErrors = !empty($validationResults['errors']);
        $hasWarnings = !empty($validationResults['warnings']);

        // Store the file
        $path = $file->store('kyc', 'public');
        $fileName = $file->getClientOriginalName();

        // Delete any existing pending document of the same type
        KycDocument::where('member_id', $member->id)
            ->where('document_type', $documentType)
            ->where('status', 'pending')
            ->delete();

        // Create KYC document record
        $document = KycDocument::create([
            'member_id' => $member->id,
            'document_type' => $documentType,
            'file_name' => $fileName,
            'disk' => 'public',
            'path' => $path,
            'status' => $hasErrors ? 'rejected' : 'pending',
            'is_clear' => $validationResults['is_clear'],
            'has_face' => $validationResults['has_face'],
            'is_kenyan_id' => $validationResults['is_kenyan_id'],
            'is_readable' => $validationResults['is_readable'],
            'validation_results' => $validationResults,
            'rejection_reason' => $hasErrors ? implode(' ', $validationResults['errors']) : null,
            'validation_errors' => $hasErrors ? implode(' | ', $validationResults['errors']) : null,
        ]);

        // Clear cached profile status
        Cache::forget('profile-status:' . $token);

        if ($hasErrors) {
            return response()->json([
                'message' => 'Document validation failed',
                'errors' => $validationResults['errors'],
                'document' => $document,
            ], 422);
        }

        return response()->json([
            'message' => 'Document uploaded successfully' . ($hasWarnings ? ' (with warnings)' : ''),
            'warnings' => $validationResults['warnings'] ?? [],
            'document' => $document,
            'validation' => [
                'is_clear' => $validationResults['is_clear'],
                'has_face' => $validationResults['has_face'],
                'is_kenyan_id' => $validationResults['is_kenyan_id'],
                'is_readable' => $validationResults['is_readable'],
            ],
        ], 201);
    }

    /**
     * Get KYC documents status for a member
     */
    public function getKycStatus($token)
    {
        $member = Member::where('public_share_token', $token)->firstOrFail();

        $documents = KycDocument::where('member_id', $member->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('document_type')
            ->map(function ($docs) {
                return $docs->first(); // Get latest document of each type
            });

        $requiredDocuments = ['front_id', 'back_id', 'selfie'];
        $uploadedDocuments = $documents->keys()->toArray();
        $missingDocuments = array_diff($requiredDocuments, $uploadedDocuments);

        return response()->json([
            'kyc_status' => $member->kyc_status,
            'documents' => $documents,
            'required' => $requiredDocuments,
            'uploaded' => $uploadedDocuments,
            'missing' => $missingDocuments,
            'is_complete' => empty($missingDocuments) && $documents->count() === count($requiredDocuments),
        ]);
    }
}
