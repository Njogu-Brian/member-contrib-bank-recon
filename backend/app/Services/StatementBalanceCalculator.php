<?php

namespace App\Services;

use App\Models\Member;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatementBalanceCalculator
{
    /**
     * Calculate running balance for member statement entries
     */
    public function calculateRunningBalance(Member $member, Collection $entries): Collection
    {
        $runningBalance = 0.0;
        
        return $entries->map(function ($entry) use (&$runningBalance) {
            // Add credits (contributions, deposits)
            if (isset($entry['credit']) && $entry['credit'] > 0) {
                $runningBalance += (float) $entry['credit'];
            }
            
            // Subtract debits (expenses, withdrawals)
            if (isset($entry['debit']) && $entry['debit'] > 0) {
                $runningBalance -= (float) $entry['debit'];
            }
            
            $entry['running_balance'] = round($runningBalance, 2);
            
            return $entry;
        });
    }
    
    /**
     * Get opening balance for a member at a specific date
     */
    public function getOpeningBalance(Member $member, string $startDate): float
    {
        // Sum all transactions before start date
        $transactionTotal = DB::table('transactions')
            ->where('member_id', $member->id)
            ->where('tran_date', '<', $startDate)
            ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
            ->where('is_archived', false)
            ->selectRaw('SUM(credit) as total_credit, SUM(debit) as total_debit')
            ->first();
        
        $transactionBalance = ($transactionTotal->total_credit ?? 0) - ($transactionTotal->total_debit ?? 0);
        
        // Sum manual contributions before start date
        $manualTotal = DB::table('manual_contributions')
            ->where('member_id', $member->id)
            ->where('contribution_date', '<', $startDate)
            ->sum('amount');
        
        // Sum transaction splits before start date
        $splitTotal = DB::table('transaction_splits')
            ->join('transactions', 'transaction_splits.transaction_id', '=', 'transactions.id')
            ->where('transaction_splits.member_id', $member->id)
            ->where('transactions.tran_date', '<', $startDate)
            ->where('transactions.is_archived', false)
            ->sum('transaction_splits.amount');
        
        // Sum expenses before start date
        $expenseTotal = DB::table('expense_members')
            ->join('expenses', 'expense_members.expense_id', '=', 'expenses.id')
            ->where('expense_members.member_id', $member->id)
            ->where('expenses.expense_date', '<', $startDate)
            ->where('expenses.approval_status', 'approved')
            ->sum('expense_members.amount');
        
        return round($transactionBalance + $manualTotal + $splitTotal - $expenseTotal, 2);
    }
}

