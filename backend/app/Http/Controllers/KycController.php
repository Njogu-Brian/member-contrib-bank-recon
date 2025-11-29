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
}

