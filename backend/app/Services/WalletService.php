<?php

namespace App\Services;

use App\Models\Contribution;
use App\Models\Member;
use App\Models\Payment;
use App\Models\PaymentPenalty;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WalletService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function list(?int $memberId = null): Collection
    {
        $query = Wallet::with(['member', 'contributions']);
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

    /**
     * Sync transactions to contributions for a member
     */
    public function syncTransactionsToContributions(Member $member, array $options = []): array
    {
        $dryRun = $options['dry_run'] ?? false;
        $startDate = $options['start_date'] ?? null;
        $endDate = $options['end_date'] ?? null;

        $wallet = $this->ensureWallet($member);

        $query = Transaction::where('member_id', $member->id)
            ->where('credit', '>', 0)
            ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
            ->where('is_archived', false);

        if ($startDate) {
            $query->whereDate('tran_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('tran_date', '<=', $endDate);
        }

        $transactions = $query->get();
        $synced = 0;
        $skipped = 0;
        $errors = [];

        foreach ($transactions as $transaction) {
            try {
                // Check if contribution already exists for this transaction
                $existingContribution = Contribution::where('reference', $transaction->transaction_code ?? "TXN-{$transaction->id}")
                    ->where('member_id', $member->id)
                    ->where('wallet_id', $wallet->id)
                    ->first();

                if ($existingContribution) {
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    $this->contribute($wallet->id, [
                        'amount' => $transaction->credit,
                        'source' => 'bank',
                        'reference' => $transaction->transaction_code ?? "TXN-{$transaction->id}",
                        'contributed_at' => $transaction->tran_date,
                        'metadata' => [
                            'transaction_id' => $transaction->id,
                            'particulars' => $transaction->particulars,
                        ],
                    ]);
                }

                $synced++;
            } catch (\Exception $e) {
                $errors[] = [
                    'transaction_id' => $transaction->id,
                    'error' => $e->getMessage(),
                ];
                Log::error('Failed to sync transaction to contribution', [
                    'transaction_id' => $transaction->id,
                    'member_id' => $member->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'total' => $transactions->count(),
            'synced' => $synced,
            'skipped' => $skipped,
            'errors' => $errors,
            'dry_run' => $dryRun,
        ];
    }
}
