<?php

namespace App\Services;

use App\Models\Contribution;
use App\Models\Member;
use App\Models\Payment;
use App\Models\PaymentPenalty;
use App\Models\Wallet;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function list(?int $memberId = null): Collection
    {
        $query = Wallet::with('member');
        if ($memberId) {
            $query->where('member_id', $memberId);
        }

        return $query->get();
    }

    public function find(int $walletId): Wallet
    {
        return Wallet::with(['member', 'contributions'])->findOrFail($walletId);
    }

    public function create(array $data): Wallet
    {
        return DB::transaction(function () use ($data) {
            $wallet = Wallet::firstOrCreate(
                ['member_id' => $data['member_id']],
                ['balance' => 0, 'locked_balance' => 0],
            );

            if (!empty($data['seed_balance'])) {
                $this->contribute($wallet->id, [
                    'amount' => $data['seed_balance'],
                    'source' => 'manual',
                    'reference' => 'seed',
                ]);
            }

            $this->auditLogger->log(auth()->id(), 'wallet.created', $wallet, $data);

            return $wallet->fresh('member');
        });
    }

    public function contribute(int $walletId, array $data): Contribution
    {
        return DB::transaction(function () use ($walletId, $data) {
            $wallet = Wallet::lockForUpdate()->findOrFail($walletId);

            $contribution = $wallet->contributions()->create([
                'member_id' => $wallet->member_id,
                'amount' => $data['amount'],
                'source' => $data['source'],
                'reference' => $data['reference'] ?? null,
                'contributed_at' => $data['contributed_at'] ?? now(),
                'metadata' => $data['metadata'] ?? null,
                'status' => 'completed',
            ]);

            $wallet->balance = $wallet->balance + $data['amount'];
            $wallet->save();

            if ($data['source'] !== 'manual') {
                Payment::create([
                    'contribution_id' => $contribution->id,
                    'member_id' => $wallet->member_id,
                    'channel' => $data['source'],
                    'provider_reference' => $data['reference'] ?? null,
                    'amount' => $data['amount'],
                    'currency' => 'KES',
                    'status' => 'completed',
                    'payload' => $data['metadata'] ?? null,
                ]);
            }

            $this->auditLogger->log(auth()->id(), 'wallet.contribution', $contribution, $data);

            return $contribution->load('wallet');
        });
    }

    public function penalties(int $memberId): Collection
    {
        return PaymentPenalty::where('member_id', $memberId)->get();
    }

    public function ensureWallet(Member $member): Wallet
    {
        return Wallet::firstOrCreate(
            ['member_id' => $member->id],
            ['balance' => 0, 'locked_balance' => 0],
        );
    }
}

