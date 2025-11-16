<?php

namespace App\Http\Controllers;

use App\Models\BankStatement;
use App\Models\Member;
use App\Models\Transaction;
use App\Models\ManualContribution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $totalMembers = Member::where('is_active', true)->count();
        $unassignedTransactions = Transaction::where('assignment_status', 'unassigned')
            ->where('is_archived', false)
            ->count();
        $draftAssignments = Transaction::where('assignment_status', 'draft')
            ->where('is_archived', false)
            ->count();
        $autoAssigned = Transaction::where('assignment_status', 'auto_assigned')
            ->where('is_archived', false)
            ->count();
        
        // Calculate total contributions from ALL transactions (including unassigned)
        $allTransactionContributions = Transaction::where('credit', '>', 0)
            ->where('is_archived', false)
            ->sum('credit');
        
        // Calculate assigned contributions (for display)
        $assignedContributions = Transaction::whereIn('assignment_status', ['auto_assigned', 'manual_assigned', 'draft'])
            ->where('credit', '>', 0)
            ->where('is_archived', false)
            ->sum('credit');
        
        // Add manual contributions
        $manualContributions = ManualContribution::sum('amount');
        
        // Total contributions = all transactions + manual
        $totalContributions = $allTransactionContributions + $manualContributions;
        
        $statementsProcessed = BankStatement::where('status', 'completed')->count();

        // Contributions by week (last 10 weeks)
        $weeksData = $this->getContributionsByWeek();
        
        // Contributions by month (all months)
        $monthsData = $this->getContributionsByMonth();

        // Recent transactions
        $recentTransactions = Transaction::with('member')
            ->where('is_archived', false)
            ->orderBy('tran_date', 'desc')
            ->limit(10)
            ->get();

        // Recent statements
        $recentStatements = BankStatement::orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'statistics' => [
                'total_members' => $totalMembers,
                'unassigned_transactions' => $unassignedTransactions,
                'draft_assignments' => $draftAssignments,
                'auto_assigned' => $autoAssigned,
                'total_contributions' => $totalContributions,
                'assigned_contributions' => $assignedContributions,
                'unassigned_contributions' => $allTransactionContributions - $assignedContributions,
                'statements_processed' => $statementsProcessed,
            ],
            'contributions_by_week' => $weeksData,
            'contributions_by_month' => $monthsData,
            'recent_transactions' => $recentTransactions,
            'recent_statements' => $recentStatements,
        ]);
    }

    protected function getContributionsByWeek()
    {
        $weeks = [];
        for ($i = 9; $i >= 0; $i--) {
            $startDate = now()->subWeeks($i)->startOfWeek();
            $endDate = now()->subWeeks($i)->endOfWeek();
            
            $transactionTotal = Transaction::whereIn('assignment_status', ['auto_assigned', 'manual_assigned', 'draft'])
                ->where('credit', '>', 0)
            ->where('is_archived', false)
                ->whereBetween('tran_date', [$startDate, $endDate])
                ->sum('credit');
            
            $manualTotal = ManualContribution::whereBetween('contribution_date', [$startDate, $endDate])
                ->sum('amount');
            
            $weeks[] = [
                'week' => $startDate->format('Y-W'),
                'week_start' => $startDate->toDateString(),
                'week_end' => $endDate->toDateString(),
                'amount' => $transactionTotal + $manualTotal,
            ];
        }
        
        return $weeks;
    }

    protected function getContributionsByMonth()
    {
        // Get the earliest transaction or manual contribution date
        $earliestTransaction = Transaction::where('credit', '>', 0)->min('tran_date');
        $earliestManual = ManualContribution::min('contribution_date');
        
        $earliestDate = null;
        if ($earliestTransaction && $earliestManual) {
            $earliestDate = min($earliestTransaction, $earliestManual);
        } elseif ($earliestTransaction) {
            $earliestDate = $earliestTransaction;
        } elseif ($earliestManual) {
            $earliestDate = $earliestManual;
        }
        
        if (!$earliestDate) {
            // If no data, show last 12 months
            $earliestDate = now()->subMonths(11)->startOfMonth();
        } else {
            $earliestDate = \Carbon\Carbon::parse($earliestDate)->startOfMonth();
        }
        
        $months = [];
        $currentMonth = now()->startOfMonth();
        $month = $earliestDate->copy();
        
        while ($month <= $currentMonth) {
            $startDate = $month->copy()->startOfMonth();
            $endDate = $month->copy()->endOfMonth();
            
            $transactionTotal = Transaction::whereIn('assignment_status', ['auto_assigned', 'manual_assigned', 'draft'])
                ->where('credit', '>', 0)
            ->where('is_archived', false)
                ->whereBetween('tran_date', [$startDate, $endDate])
                ->sum('credit');
            
            $manualTotal = ManualContribution::whereBetween('contribution_date', [$startDate, $endDate])
                ->sum('amount');
            
            $months[] = [
                'month' => $startDate->format('Y-m'),
                'month_name' => $startDate->format('F Y'),
                'amount' => $transactionTotal + $manualTotal,
            ];
            
            $month->addMonth();
        }
        
        return $months;
    }
}

