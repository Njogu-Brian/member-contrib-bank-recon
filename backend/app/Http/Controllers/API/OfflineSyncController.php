<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OfflineSyncController extends Controller
{
    /**
     * Sync offline data to server
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'data' => 'required|array',
            'data.contributions' => 'nullable|array',
            'data.contributions.*.amount' => 'required|numeric|min:0.01',
            'data.contributions.*.date' => 'required|date',
            'data.contributions.*.reference' => 'nullable|string',
            'data.profile_changes' => 'nullable|array',
            'data.last_sync' => 'nullable|date',
        ]);

        $user = $request->user();
        $member = $user->member;

        if (!$member) {
            return response()->json([
                'message' => 'No member associated with this user',
            ], 422);
        }

        $synced = [];
        $errors = [];

        DB::beginTransaction();
        try {
            // Sync contributions
            if (isset($validated['data']['contributions'])) {
                foreach ($validated['data']['contributions'] as $contribution) {
                    try {
                        $wallet = $member->wallet ?? app(\App\Services\WalletService::class)->ensureWallet($member);
                        
                        $created = app(\App\Services\WalletService::class)->contribute($wallet->id, [
                            'amount' => $contribution['amount'],
                            'source' => 'offline_sync',
                            'reference' => $contribution['reference'] ?? 'Offline sync: ' . ($contribution['date'] ?? now()),
                            'contributed_at' => $contribution['date'] ?? now(),
                            'metadata' => [
                                'synced_at' => now(),
                                'offline_id' => $contribution['offline_id'] ?? null,
                            ],
                        ]);

                        $synced['contributions'][] = [
                            'offline_id' => $contribution['offline_id'] ?? null,
                            'id' => $created->id,
                        ];
                    } catch (\Exception $e) {
                        $errors[] = [
                            'type' => 'contribution',
                            'offline_id' => $contribution['offline_id'] ?? null,
                            'error' => $e->getMessage(),
                        ];
                        Log::error('Offline sync contribution error', [
                            'member_id' => $member->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            // Sync profile changes
            if (isset($validated['data']['profile_changes'])) {
                foreach ($validated['data']['profile_changes'] as $change) {
                    try {
                        $allowedFields = ['phone', 'email', 'whatsapp_number', 'church', 'gender', 'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship'];
                        $updateData = array_intersect_key($change, array_flip($allowedFields));
                        
                        if (!empty($updateData)) {
                            $member->update($updateData);
                            $synced['profile_changes'][] = [
                                'offline_id' => $change['offline_id'] ?? null,
                                'updated' => true,
                            ];
                        }
                    } catch (\Exception $e) {
                        $errors[] = [
                            'type' => 'profile_change',
                            'offline_id' => $change['offline_id'] ?? null,
                            'error' => $e->getMessage(),
                        ];
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Sync completed',
                'synced' => $synced,
                'errors' => $errors,
                'sync_timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Offline sync failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Sync failed: ' . $e->getMessage(),
                'errors' => $errors,
            ], 500);
        }
    }

    /**
     * Get data for offline mode
     */
    public function getOfflineData(Request $request): JsonResponse
    {
        $user = $request->user();
        $member = $user->member;

        if (!$member) {
            return response()->json([
                'message' => 'No member associated with this user',
            ], 422);
        }

        // Get member data
        $memberData = [
            'id' => $member->id,
            'name' => $member->name,
            'phone' => $member->phone,
            'email' => $member->email,
            'member_code' => $member->member_code,
            'wallet_balance' => $member->wallet->balance ?? 0,
        ];

        // Get recent transactions (last 30 days)
        $transactions = $member->transactions()
            ->where('tran_date', '>=', now()->subDays(30))
            ->where('is_archived', false)
            ->orderBy('tran_date', 'desc')
            ->get(['id', 'tran_date', 'particulars', 'credit', 'debit'])
            ->map(function ($txn) {
                return [
                    'id' => $txn->id,
                    'date' => $txn->tran_date,
                    'description' => $txn->particulars,
                    'amount' => (float) ($txn->credit ?? 0) - (float) ($txn->debit ?? 0),
                ];
            });

        // Get pending invoices
        $invoices = $member->invoices()
            ->whereIn('status', ['pending', 'overdue'])
            ->get(['id', 'invoice_number', 'amount', 'issue_date', 'due_date', 'status'])
            ->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'amount' => (float) $invoice->amount,
                    'issue_date' => $invoice->issue_date,
                    'due_date' => $invoice->due_date,
                    'status' => $invoice->status,
                ];
            });

        // Get savings goals
        $savingsGoals = \App\Models\SavingsGoal::where('member_id', $member->id)
            ->where('status', 'active')
            ->get(['id', 'name', 'target_amount', 'current_amount', 'target_date'])
            ->map(function ($goal) {
                return [
                    'id' => $goal->id,
                    'name' => $goal->name,
                    'target_amount' => (float) $goal->target_amount,
                    'current_amount' => (float) $goal->current_amount,
                    'target_date' => $goal->target_date,
                    'progress' => $goal->progress_percentage,
                ];
            });

        return response()->json([
            'member' => $memberData,
            'transactions' => $transactions,
            'invoices' => $invoices,
            'savings_goals' => $savingsGoals,
            'sync_timestamp' => now()->toIso8601String(),
            'offline_mode_enabled' => true,
        ]);
    }

    /**
     * Check sync status
     */
    public function syncStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $lastSync = $request->get('last_sync');

        return response()->json([
            'needs_sync' => true, // Always return true for now - can be enhanced with actual comparison
            'server_time' => now()->toIso8601String(),
            'last_sync' => $lastSync,
        ]);
    }
}

