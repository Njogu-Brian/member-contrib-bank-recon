<?php

namespace App\Observers;

use App\Models\Member;
use App\Services\WalletService;

class MemberObserver
{
    public function __construct(
        private readonly WalletService $walletService
    ) {
    }

    /**
     * Handle the Member "created" event.
     */
    public function created(Member $member): void
    {
        // Auto-create wallet when member is created
        // This will be created even before activation for consistency
        $this->walletService->ensureWallet($member);
    }

    /**
     * Handle the Member "updated" event.
     */
    public function updated(Member $member): void
    {
        // When member is activated, ensure wallet exists
        if ($member->wasChanged('is_active') && $member->is_active && $member->activated_at) {
            $this->walletService->ensureWallet($member);
        }
    }
}

