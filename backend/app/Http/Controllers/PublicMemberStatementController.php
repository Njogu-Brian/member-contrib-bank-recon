<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class PublicMemberStatementController extends Controller
{
    /**
     * Display public member statement view (no authentication required)
     * Accessible via: /public/statement/{token}
     */
    public function show(Request $request, string $token)
    {
        $member = Member::where('public_share_token', $token)
            ->where('is_active', true)
            ->first();

        if (!$member) {
            return response()->json([
                'error' => 'Invalid or expired link',
                'message' => 'This statement link is invalid or has expired.',
            ], 404);
        }

        // Build statement data (same logic as MemberController::statement)
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
            'per_page' => 'nullable|integer|min:1|max:500',
            'page' => 'nullable|integer|min:1',
        ]);

        $data = $this->buildStatementData($member, $validated);
        $collection = $data['collection'];

        $perPage = max(1, (int) $request->get('per_page', 25));
        $page = max(1, (int) $request->get('page', 1));
        $total = $collection->count();

        $paginatedStatement = new LengthAwarePaginator(
            $collection->slice(($page - 1) * $perPage, $perPage)->values(),
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return response()->json([
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'member_code' => $member->member_code,
                'member_number' => $member->member_number,
                'phone' => $member->phone,
                'email' => $member->email,
                // Don't expose sensitive data in public view
            ],
            'statement' => $paginatedStatement->items(),
            'summary' => $data['summary'],
            'pagination' => [
                'current_page' => $paginatedStatement->currentPage(),
                'per_page' => $paginatedStatement->perPage(),
                'total' => $paginatedStatement->total(),
                'last_page' => $paginatedStatement->lastPage(),
            ],
            'monthly_totals' => $data['monthly_totals'],
        ]);
    }

    /**
     * Build statement data (simplified version for public view)
     */
    protected function buildStatementData(Member $member, array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? null;
        $endDate = $filters['end_date'] ?? null;
        $monthFilter = $filters['month'] ?? null;

        if ($monthFilter) {
            $month = \Carbon\Carbon::createFromFormat('Y-m', $monthFilter);
            $startDate = $month->copy()->startOfMonth()->toDateString();
            $endDate = $month->copy()->endOfMonth()->toDateString();
        }

        $transactions = $member->transactions()
            ->with(['splits', 'bankStatement'])
            ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
            ->where('is_archived', false)
            ->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate))
            ->orderBy('tran_date', 'desc')
            ->get();

        $manualContributions = $member->manualContributions()
            ->when($startDate, fn ($q) => $q->where('contribution_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('contribution_date', '<=', $endDate))
            ->orderBy('contribution_date', 'desc')
            ->get();

        $splits = $member->transactionSplits()
            ->with(['transaction' => function ($query) {
                $query->select('id', 'bank_statement_id', 'tran_date', 'particulars', 'transaction_code')
                      ->with('bankStatement:id,filename');
            }])
            ->whereHas('transaction', function ($query) use ($startDate, $endDate) {
                $query->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
                      ->where('is_archived', false)
                      ->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
                      ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate));
            })
            ->get();

        $statementCollection = collect()
            ->merge($transactions->map(function ($t) use ($member) {
                $distributed = $t->splits->sum('amount');
                $ownerAmount = max(0, $t->credit - $distributed);
                if ($ownerAmount <= 0) {
                    return null;
                }

                return [
                    'date' => $t->tran_date,
                    'type' => $t->splits->isNotEmpty() ? 'shared_contribution' : 'contribution',
                    'description' => $t->particulars,
                    'amount' => $ownerAmount,
                    'reference' => $t->transaction_code ?? ('Transaction #' . $t->id),
                    'source' => $t->transaction_type ?? 'Bank',
                ];
            })->filter())
            ->merge($manualContributions->map(fn ($mc) => [
                'date' => $mc->contribution_date,
                'type' => 'manual_contribution',
                'description' => 'Manual Contribution' . ($mc->notes ? ' - ' . $mc->notes : ''),
                'amount' => $mc->amount,
                'reference' => $mc->reference ?? ('Manual #' . $mc->id),
                'source' => 'Manual Entry',
            ]))
            ->merge($splits->map(function ($split) use ($member) {
                if (!$split->transaction) {
                    return null;
                }
                $transaction = $split->transaction;
                return [
                    'date' => $transaction->tran_date,
                    'type' => 'shared_contribution',
                    'description' => 'Shared from ' . ($transaction->particulars ?? 'Transaction #' . $transaction->id),
                    'amount' => $split->amount,
                    'reference' => $transaction->transaction_code ?? ('Transaction #' . $transaction->id),
                    'source' => 'Shared Transaction',
                ];
            })->filter())
            ->sortByDesc('date')
            ->values();

        $monthlyTotals = $statementCollection
            ->groupBy(fn ($entry) => \Carbon\Carbon::parse($entry['date'])->format('Y-m'))
            ->sortKeysDesc()
            ->map(function ($group, $label) {
                $contributions = $group->where('amount', '>=', 0)->sum('amount');
                return [
                    'month_key' => $label,
                    'label' => \Carbon\Carbon::createFromFormat('Y-m', $label)->format('M Y'),
                    'contributions' => round($contributions, 2),
                    'net' => round($group->sum('amount'), 2),
                ];
            })
            ->values();

        $summary = [
            'total_contributions' => (float) $member->total_contributions,
            'expected_contributions' => (float) $member->expected_contributions,
            'difference' => (float) $member->total_contributions - (float) $member->expected_contributions,
            'contribution_status' => $member->contribution_status_label,
            'period_total' => $statementCollection->sum('amount'),
        ];

        return [
            'collection' => $statementCollection,
            'summary' => $summary,
            'monthly_totals' => $monthlyTotals,
        ];
    }
}

