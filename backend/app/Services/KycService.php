<?php

namespace App\Services;

use App\Models\KycDocument;
use App\Models\Member;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class KycService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly WalletService $walletService
    ) {
    }

    /**
     * Approve a KYC document
     */
    public function approveDocument(KycDocument $document, ?int $approvedBy = null, ?string $notes = null): KycDocument
    {
        return DB::transaction(function () use ($document, $approvedBy, $notes) {
            $document->update([
                'status' => 'approved',
                'approved_by' => $approvedBy ?? auth()->id(),
                'approved_at' => now(),
                'rejection_reason' => null,
                'notes' => $notes ?? $document->notes,
            ]);

            // Update member KYC status if document is linked to a member
            if ($document->member_id) {
                $member = Member::find($document->member_id);
                if ($member) {
                    $this->updateMemberKycStatus($member, $approvedBy);
                }
            }

            // Update user profile KYC status if document is linked to a user
            if ($document->user_id) {
                $user = User::find($document->user_id);
                if ($user && $user->profile) {
                    $user->profile->update([
                        'kyc_status' => 'approved',
                        'kyc_verified_at' => now(),
                    ]);
                }
            }

            $this->auditLogger->log(
                $approvedBy ?? auth()->id(),
                'kyc.document.approved',
                $document,
                ['document_id' => $document->id]
            );

            return $document->fresh();
        });
    }

    /**
     * Reject a KYC document
     */
    public function rejectDocument(KycDocument $document, string $reason, ?int $rejectedBy = null): KycDocument
    {
        return DB::transaction(function () use ($document, $reason, $rejectedBy) {
            $document->update([
                'status' => 'rejected',
                'approved_by' => null,
                'approved_at' => null,
                'rejection_reason' => $reason,
            ]);

            // Update member KYC status if document is linked to a member
            if ($document->member_id) {
                $member = Member::find($document->member_id);
                if ($member) {
                    $member->update([
                        'kyc_status' => 'rejected',
                        'kyc_rejection_reason' => $reason,
                    ]);
                }
            }

            // Update user profile KYC status if document is linked to a user
            if ($document->user_id) {
                $user = User::find($document->user_id);
                if ($user && $user->profile) {
                    $user->profile->update([
                        'kyc_status' => 'rejected',
                    ]);
                }
            }

            $this->auditLogger->log(
                $rejectedBy ?? auth()->id(),
                'kyc.document.rejected',
                $document,
                ['document_id' => $document->id, 'reason' => $reason]
            );

            return $document->fresh();
        });
    }

    /**
     * Get pending KYC documents
     */
    public function getPendingDocuments(?int $memberId = null, ?int $userId = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = KycDocument::where('status', 'pending')
            ->with(['user', 'member']);

        if ($memberId) {
            $query->where('member_id', $memberId);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Update member KYC status based on all documents
     */
    protected function updateMemberKycStatus(Member $member, ?int $approvedBy = null): void
    {
        $pendingDocuments = KycDocument::where('member_id', $member->id)
            ->where('status', 'pending')
            ->count();

        $rejectedDocuments = KycDocument::where('member_id', $member->id)
            ->where('status', 'rejected')
            ->count();

        $approvedDocuments = KycDocument::where('member_id', $member->id)
            ->where('status', 'approved')
            ->count();

        // Determine overall KYC status
        if ($rejectedDocuments > 0) {
            $member->update([
                'kyc_status' => 'rejected',
            ]);
        } elseif ($pendingDocuments > 0) {
            $member->update([
                'kyc_status' => 'pending',
            ]);
        } elseif ($approvedDocuments > 0) {
            // Check if all required documents are approved
            $totalDocuments = KycDocument::where('member_id', $member->id)->count();
            
            if ($totalDocuments > 0 && $approvedDocuments === $totalDocuments) {
                $member->update([
                    'kyc_status' => 'approved',
                    'kyc_approved_at' => now(),
                    'kyc_approved_by' => $approvedBy ?? auth()->id(),
                ]);
            }
        }
    }

    /**
     * Activate a member after KYC approval
     */
    public function activateMember(Member $member, ?int $activatedBy = null): Member
    {
        if ($member->kyc_status !== 'approved') {
            throw new \Exception('Member KYC must be approved before activation');
        }

        return DB::transaction(function () use ($member, $activatedBy) {
            // Activate member
            $member->update([
                'is_active' => true,
                'activated_at' => now(),
                'activated_by' => $activatedBy ?? auth()->id(),
            ]);

            // Auto-create wallet if it doesn't exist
            $this->walletService->ensureWallet($member);

            $this->auditLogger->log(
                $activatedBy ?? auth()->id(),
                'member.activated',
                $member,
                ['member_id' => $member->id]
            );

            return $member->fresh();
        });
    }

    /**
     * Check if member can be activated
     */
    public function canActivateMember(Member $member): bool
    {
        return $member->kyc_status === 'approved' && !$member->is_active;
    }
}

