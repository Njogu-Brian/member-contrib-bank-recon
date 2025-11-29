<?php

namespace App\Policies;

use App\Models\KycDocument;
use App\Models\Member;
use App\Models\User;

class KycPolicy
{
    /**
     * Determine if user can view KYC documents
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('kyc.view');
    }

    /**
     * Determine if user can view a specific KYC document
     */
    public function view(User $user, KycDocument $document): bool
    {
        return $user->hasPermission('kyc.view');
    }

    /**
     * Determine if user can approve KYC documents
     */
    public function approve(User $user, KycDocument $document): bool
    {
        return $user->hasPermission('kyc.approve');
    }

    /**
     * Determine if user can reject KYC documents
     */
    public function reject(User $user, KycDocument $document): bool
    {
        return $user->hasPermission('kyc.approve'); // Same permission for approve/reject
    }

    /**
     * Determine if user can activate members
     */
    public function activateMember(User $user, Member $member): bool
    {
        return $user->hasPermission('members.manage');
    }
}

