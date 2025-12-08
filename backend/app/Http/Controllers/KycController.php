<?php

namespace App\Http\Controllers;

use App\Models\KycDocument;
use App\Models\Member;
use App\Services\KycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KycController extends Controller
{
    public function __construct(
        private readonly KycService $kycService
    ) {
    }

    /**
     * Get pending KYC documents
     */
    public function pending(Request $request): JsonResponse
    {
        $memberId = $request->query('member_id');
        $userId = $request->query('user_id');

        $documents = $this->kycService->getPendingDocuments($memberId, $userId);

        return response()->json($documents);
    }

    /**
     * Approve a KYC document
     */
    public function approve(Request $request, KycDocument $document): JsonResponse
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $document = $this->kycService->approveDocument(
                $document,
                auth()->id(),
                $validated['notes'] ?? null
            );

            return response()->json([
                'message' => 'KYC document approved successfully',
                'document' => $document->load(['user', 'member', 'approvedBy']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to approve document: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Reject a KYC document
     */
    public function reject(Request $request, KycDocument $document): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        try {
            $document = $this->kycService->rejectDocument(
                $document,
                $validated['reason'],
                auth()->id()
            );

            return response()->json([
                'message' => 'KYC document rejected successfully',
                'document' => $document->load(['user', 'member']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to reject document: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Activate a member after KYC approval
     */
    public function activateMember(Request $request, Member $member): JsonResponse
    {
        try {
            if (!$this->kycService->canActivateMember($member)) {
                return response()->json([
                    'message' => 'Member cannot be activated. KYC must be approved first.',
                ], 422);
            }

            $member = $this->kycService->activateMember($member, auth()->id());

            return response()->json([
                'message' => 'Member activated successfully',
                'member' => $member,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to activate member: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Upload KYC document (Admin - for member)
     */
    public function uploadDocument(Request $request, Member $member): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => 'required|string|in:front_id,back_id,selfie,kra_pin,profile_photo',
            'document' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:5120', // 5MB
            ],
        ]);

        $file = $request->file('document');
        
        // Validate file
        try {
            $documentValidationService = app(\App\Services\DocumentValidationService::class);
            $validationResult = $documentValidationService->validate($file);
            
            if (!$validationResult['valid']) {
                return response()->json([
                    'message' => 'Document validation failed: ' . ($validationResult['error'] ?? 'Invalid file'),
                ], 422);
            }
        } catch (\Exception $e) {
            \Log::warning('Document validation error', ['error' => $e->getMessage()]);
        }

        // Store file
        $path = $file->store('kyc', 'public');
        $fileName = $file->getClientOriginalName();

        // Delete any existing pending document of the same type for this member
        KycDocument::where('member_id', $member->id)
            ->where('document_type', $validated['document_type'])
            ->where('status', 'pending')
            ->delete();

        // Create document record
        $document = KycDocument::create([
            'user_id' => auth()->id(),
            'member_id' => $member->id,
            'document_type' => $validated['document_type'],
            'file_name' => $fileName,
            'disk' => 'public',
            'path' => $path,
            'status' => 'pending',
        ]);

        $this->kycService->logDocumentUpload($document, auth()->id());

        return response()->json([
            'message' => 'Document uploaded successfully',
            'document' => $document->load('member'),
        ], 201);
    }
}

