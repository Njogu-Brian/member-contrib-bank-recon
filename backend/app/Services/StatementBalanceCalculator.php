<?php

namespace App\Services;

use App\Models\Member;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatementBalanceCalculator
{
    /**
     * Calculate running balance for member statement entries.
     * Credits increase balance; debits decrease it. Supports credit/debit or amount fields.
     */
    public function calculateRunningBalance(Member $member, Collection $entries, float $openingBalance = 0.0): Collection
    {
        $runningBalance = $openingBalance;

        return $entries->map(function ($entry) use (&$runningBalance) {
            $delta = $this->entryDelta($entry);
            $runningBalance += $delta;
            $entry['running_balance'] = round($runningBalance, 2);

            return $entry;
        });
    }

    /**
     * Net effect of a statement entry on the running balance.
     */
    public function entryDelta(array $entry): float
    {
        if (array_key_exists('amount', $entry) && $entry['amount'] !== null && !isset($entry['credit']) && !isset($entry['debit'])) {
            return (float) $entry['amount'];
        }

        $credit = (float) ($entry['credit'] ?? 0);
        $debit = (float) ($entry['debit'] ?? 0);

        if ($credit !== 0.0 || $debit !== 0.0) {
            return $credit - $debit;
        }

        return (float) ($entry['amount'] ?? 0);
    }

    /**
     * Get opening balance for a member at a specific date (activity before startDate).
     */
    public function getOpeningBalance(Member $member, string $startDate): float
    {
        // Owner remainder on assigned transactions (credit minus splits)
        $transactions = DB::table('transactions')
            ->leftJoin('transaction_splits', 'transactions.id', '=', 'transaction_splits.transaction_id')
            ->where('transactions.member_id', $member->id)
            ->where('transactions.tran_date', '<', $startDate)
            ->whereNotIn('transactions.assignment_status', ['unassigned', 'duplicate'])
            ->where('transactions.is_archived', false)
            ->groupBy('transactions.id', 'transactions.credit')
            ->selectRaw('transactions.credit - COALESCE(SUM(transaction_splits.amount), 0) as owner_amount')
            ->get();

        $transactionBalance = $transactions->sum(fn ($row) => max(0, (float) $row->owner_amount));

        $manualTotal = (float) DB::table('manual_contributions')
            ->where('member_id', $member->id)
            ->where('contribution_date', '<', $startDate)
            ->sum('amount');

        $splitTotal = (float) DB::table('transaction_splits')
            ->join('transactions', 'transaction_splits.transaction_id', '=', 'transactions.id')
            ->where('transaction_splits.member_id', $member->id)
            ->where('transactions.tran_date', '<', $startDate)
            ->whereNotIn('transactions.assignment_status', ['unassigned', 'duplicate'])
            ->where('transactions.is_archived', false)
            ->sum('transaction_splits.amount');

        $expenseTotal = (float) DB::table('expense_members')
            ->join('expenses', 'expense_members.expense_id', '=', 'expenses.id')
            ->where('expense_members.member_id', $member->id)
            ->where('expenses.expense_date', '<', $startDate)
            ->where('expenses.approval_status', 'approved')
            ->sum('expense_members.amount');

        $invoiceTotal = (float) DB::table('invoices')
            ->where('member_id', $member->id)
            ->where('issue_date', '<', $startDate)
            ->sum('amount');

        return round($transactionBalance + $manualTotal + $splitTotal - $expenseTotal - $invoiceTotal, 2);
    }
}
