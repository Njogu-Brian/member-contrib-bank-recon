<?php

use App\Models\Member;
use Illuminate\Database\Migrations\Migration;

/**
 * Every member should have a permanent statement link token unless an admin explicitly rotates it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Member::query()
            ->where(function ($q) {
                $q->whereNull('public_share_token')
                    ->orWhere('public_share_token', '');
            })
            ->chunkById(100, function ($members) {
                foreach ($members as $member) {
                    try {
                        $member->getPublicShareToken();
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::warning('backfill public_share_token failed', [
                            'member_id' => $member->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
    }

    public function down(): void
    {
        // Intentionally empty: do not strip tokens on rollback.
    }
};
