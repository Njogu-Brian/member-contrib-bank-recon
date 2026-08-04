<?php

namespace App\Services;

use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class MemberStatementService
{
    public function __construct(
        protected StatementBalanceCalculator $balanceCalculator
    ) {
    }

    /**
     * Build full member statement: contributions, splits, manual entries, expenses, invoices.
     */
    public function buildStatementData(Member $member, array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? null;
        $endDate = $filters['end_date'] ?? null;
        $monthFilter = $filters['month'] ?? null;

        if ($monthFilter) {
            $month = Carbon::createFromFormat('Y-m', $monthFilter);
            $startDate = $month->copy()->startOfMonth()->toDateString();
            $endDate = $month->copy()->endOfMonth()->toDateString();
        }

        $transactions = $member->transactions()
            ->with(['member', 'splits', 'bankStatement'])
            ->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate))
            ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
            ->where('is_archived', false)
            ->orderBy('tran_date', 'asc')
            ->get();

        $manualContributions = $member->manualContributions()
            ->when($startDate, fn ($q) => $q->where('contribution_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('contribution_date', '<=', $endDate))
            ->orderBy('contribution_date', 'asc')
            ->get();

        $expenses = $member->expenses()
            ->where('approval_status', 'approved')
            ->when($startDate, fn ($q) => $q->where('expense_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('expense_date', '<=', $endDate))
            ->orderBy('expense_date', 'asc')
            ->get();

        $splits = $member->transactionSplits()
            ->with(['transaction' => function ($query) {
                $query->select('id', 'bank_statement_id', 'tran_date', 'particulars', 'transaction_code')
                      ->with('bankStatement:id,filename')
                      ->where('is_archived', false);
            }])
            ->whereHas('transaction', function ($query) use ($startDate, $endDate) {
                $query->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
                      ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate))
                      ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
                      ->where('is_archived', false);
            })
            ->get();

        $invoices = $member->invoices()
            ->when($startDate, fn ($q) => $q->where('issue_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('issue_date', '<=', $endDate))
            ->orderBy('issue_date', 'asc')
            ->get();

        $monthlyInvoices = $invoices->groupBy(function ($invoice) {
            $weekParts = explode('-W', $invoice->period);
            if (count($weekParts) === 2) {
                $year = $weekParts[0];
                $week = $weekParts[1];
                $weekStart = Carbon::now()->setISODate($year, $week)->startOfWeek();
                return $weekStart->format('Y-m');
            }
            return Carbon::parse($invoice->issue_date)->format('Y-m');
        })->map(function ($monthInvoices, $monthKey) use ($member) {
            $total = $monthInvoices->sum('amount');
            $firstInvoice = $monthInvoices->first();
            $monthDate = Carbon::createFromFormat('Y-m', $monthKey)->endOfMonth();

            return [
                'date' => $monthDate->toDateString(),
                'type' => 'invoice',
                'description' => 'Weekly contribution invoices for ' . $monthDate->format('F Y') . ' (' . $monthInvoices->count() . ' weeks)',
                'credit' => 0,
                'debit' => $total,
                'reference' => 'Invoice #' . $firstInvoice->invoice_number . ' + ' . ($monthInvoices->count() - 1) . ' more',
                'transaction_id' => null,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'is_split' => false,
                'statement_id' => null,
                'statement_name' => null,
                'invoice_ids' => $monthInvoices->pluck('id')->toArray(),
                'invoice_count' => $monthInvoices->count(),
            ];
        });

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
                    'credit' => $ownerAmount,
                    'debit' => 0,
                    'reference' => $t->transaction_code ?? ('Transaction #' . $t->id),
                    'transaction_id' => $t->id,
                    'member_id' => $member->id,
                    'member_name' => $member->name,
                    'is_split' => $t->splits->isNotEmpty(),
                    'statement_id' => $t->bank_statement_id,
                    'statement_name' => optional($t->bankStatement)->filename,
                ];
            })->filter())
            ->merge($manualContributions->map(fn ($mc) => [
                'date' => $mc->contribution_date,
                'type' => 'manual_contribution',
                'description' => 'Manual Contribution' . ($mc->payment_method ? ' - ' . $mc->payment_method : '') . ($mc->notes ? ' - ' . $mc->notes : ''),
                'credit' => $mc->amount,
                'debit' => 0,
                'reference' => $mc->reference ?? ('Manual #' . $mc->id),
                'transaction_id' => null,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'is_split' => false,
                'statement_id' => null,
                'statement_name' => null,
            ]))
            ->merge($expenses->map(fn ($e) => [
                'date' => $e->expense_date,
                'type' => 'expense',
                'description' => $e->description . ' (' . $e->category . ')',
                'credit' => 0,
                'debit' => $e->pivot->amount,
                'reference' => 'Expense #' . $e->id,
                'transaction_id' => null,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'is_split' => false,
                'statement_id' => null,
                'statement_name' => null,
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
                    'credit' => (float) $split->amount,
                    'debit' => 0,
                    'reference' => $transaction->transaction_code ?? ('Transaction #' . $transaction->id),
                    'transaction_id' => $transaction->id,
                    'member_id' => $member->id,
                    'member_name' => $member->name,
                    'is_split' => true,
                    'statement_id' => $transaction->bank_statement_id,
                    'statement_name' => optional($transaction->bankStatement)->filename,
                ];
            })->filter())
            ->merge($monthlyInvoices->values())
            ->sortByDesc('date')
            ->values();

        $monthlyTotals = $statementCollection
            ->groupBy(fn ($entry) => Carbon::parse($entry['date'])->format('Y-m'))
            ->sortKeysDesc()
            ->map(function ($group, $label) {
                $getAmount = fn ($entry) => $entry['amount'] ?? (($entry['credit'] ?? 0) - ($entry['debit'] ?? 0));

                $contributions = $group->sum(fn ($entry) => max(0, $getAmount($entry)));
                $expensesSum = $group->sum(fn ($entry) => min(0, $getAmount($entry)));
                $net = $group->sum(fn ($entry) => $getAmount($entry));

                return [
                    'month_key' => $label,
                    'label' => Carbon::createFromFormat('Y-m', $label)->format('M Y'),
                    'contributions' => round($contributions, 2),
                    'expenses' => round(abs($expensesSum), 2),
                    'net' => round($net, 2),
                ];
            })
            ->values();

        $totalInvoices = $member->invoices()->sum('amount');
        $pendingInvoices = $member->invoices()->whereIn('status', ['pending', 'overdue'])->sum('amount');

        $openingBalance = 0.0;
        if ($startDate) {
            $openingBalance = $this->balanceCalculator->getOpeningBalance($member, $startDate);
        }

        $sortedForBalance = $statementCollection->sortBy('date')->values();
        $entriesWithBalance = $this->balanceCalculator->calculateRunningBalance(
            $member,
            $sortedForBalance,
            $openingBalance
        );

        $closingBalance = $entriesWithBalance->isNotEmpty()
            ? (float) $entriesWithBalance->last()['running_balance']
            : $openingBalance;

        $summary = [
            'total_contributions' => (float) $member->total_contributions,
            'expected_contributions' => (float) $member->expected_contributions,
            'difference' => (float) $member->total_contributions - (float) $member->expected_contributions,
            'contribution_status' => $member->contribution_status,
            'contribution_status_label' => $member->contribution_status_label,
            'contribution_status_color' => $member->contribution_status_color,
            'total_expenses' => round($expenses->sum(fn ($expense) => $expense->pivot->amount ?? 0), 2),
            'total_invoices' => round($totalInvoices, 2),
            'pending_invoices' => round($pendingInvoices, 2),
            'period_total' => round($statementCollection->sum(fn ($e) => ($e['credit'] ?? 0) - ($e['debit'] ?? 0) + ($e['amount'] ?? 0)), 2),
            'opening_balance' => round($openingBalance, 2),
            'closing_balance' => round($closingBalance, 2),
        ];

        return [
            'collection' => $statementCollection,
            'collection_with_balance' => $entriesWithBalance,
            'monthly_totals' => $monthlyTotals,
            'summary' => $summary,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'month' => $monthFilter,
            ],
            'range_label' => $this->formatRangeLabel($startDate, $endDate, $monthFilter),
        ];
    }

    public function formatRangeLabel(?string $startDate, ?string $endDate, ?string $monthFilter): string
    {
        if ($monthFilter) {
            return Carbon::createFromFormat('Y-m', $monthFilter)->format('F Y');
        }

        if ($startDate && $endDate) {
            return Carbon::parse($startDate)->format('d M Y') . ' - ' . Carbon::parse($endDate)->format('d M Y');
        }

        if ($startDate) {
            return 'From ' . Carbon::parse($startDate)->format('d M Y');
        }

        if ($endDate) {
            return 'Until ' . Carbon::parse($endDate)->format('d M Y');
        }

        return 'All Time';
    }

    public function buildExportFilename(string $memberName, ?string $month, string $ext): string
    {
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $memberName);
        $datePart = $month
            ? Carbon::createFromFormat('Y-m', $month)->format('Y-m')
            : now()->format('Y-m-d');

        return "statement_{$safeName}_{$datePart}.{$ext}";
    }
}
