<?php

namespace App\Http\Controllers;

use App\Models\BankStatement;
use App\Models\Member;
use App\Models\Transaction;
use App\Models\ManualContribution;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\Meeting;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Public snapshot for login page (no auth required)
     */
    public function publicSnapshot()
    {
        try {
            // Pending approvals = draft assignments that need approval
            $pendingApprovals = $this->excludeDuplicateTransactions(
                Transaction::where('assignment_status', 'draft')
                    ->where('is_archived', false)
            )->count();
            
            // Today's inflow = total credits from transactions today (excluding duplicates)
            $todayStart = now()->startOfDay();
            $todayEnd = now()->endOfDay();
            
            $todayInflow = $this->excludeDuplicateTransactions(
                Transaction::where('credit', '>', 0)
                    ->where('is_archived', false)
                    ->whereBetween('tran_date', [$todayStart, $todayEnd])
            )->sum('credit');
            
            // Also include manual contributions from today
            $todayManual = ManualContribution::whereDate('contribution_date', today())
                ->sum('amount');
            
            $todayTotal = $todayInflow + $todayManual;
            
            return response()->json([
                'pending_approvals' => $pendingApprovals,
                'today_inflow' => round($todayTotal, 2),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            \Illuminate\Support\Facades\Log::error('Database error in publicSnapshot: ' . $e->getMessage());
            // Return default values if database is unavailable
            return response()->json([
                'pending_approvals' => 0,
                'today_inflow' => 0,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in publicSnapshot: ' . $e->getMessage());
            return response()->json([
                'pending_approvals' => 0,
                'today_inflow' => 0,
            ], 500);
        }
    }

    public function index()
    {
        try {
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
            $allTransactionContributions = $this->excludeDuplicateTransactions(
                Transaction::where('credit', '>', 0)
                    ->where('is_archived', false)
            )->sum('credit');
            
            // Calculate assigned contributions (for display)
            $assignedContributions = Transaction::whereIn('assignment_status', ['auto_assigned', 'manual_assigned', 'draft', 'transferred'])
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
            $recentTransactions = $this->excludeDuplicateTransactions(
                Transaction::with('member')->where('is_archived', false)
            )
                ->orderBy('tran_date', 'desc')
                ->limit(10)
                ->get();

            // Recent statements
            $recentStatements = BankStatement::orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            // Invoice metrics (with error handling)
            $totalInvoices = 0;
            $pendingInvoices = 0;
            $paidInvoices = 0;
            $overdueInvoices = 0;
            $invoiceCount = 0;
            $pendingInvoiceCount = 0;
            $collectionRate = 0;
            
            try {
                $totalInvoices = Invoice::sum('amount');
                $pendingInvoices = Invoice::whereIn('status', ['pending', 'overdue'])->sum('amount');
                $paidInvoices = Invoice::where('status', 'paid')->sum('amount');
                $overdueInvoices = Invoice::where('status', 'overdue')->sum('amount');
                $invoiceCount = Invoice::count();
                $pendingInvoiceCount = Invoice::whereIn('status', ['pending', 'overdue'])->count();
                $collectionRate = $totalInvoices > 0 ? ($paidInvoices / $totalInvoices) * 100 : 0;
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Error getting invoice metrics: ' . $e->getMessage());
            }

            // Expense metrics (with error handling)
            $totalExpenses = 0;
            $pendingExpenses = 0;
            $monthlyExpenses = 0;
            
            try {
                $totalExpenses = Expense::where('approval_status', 'approved')->sum('amount');
                $pendingExpenses = Expense::where('approval_status', 'pending')->count();
                $monthlyExpenses = Expense::where('approval_status', 'approved')
                    ->whereMonth('expense_date', now()->month)
                    ->whereYear('expense_date', now()->year)
                    ->sum('amount');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Error getting expense metrics: ' . $e->getMessage());
            }

            // Engagement metrics (with error handling)
            $upcomingMeetings = 0;
            $activeAnnouncements = 0;
            
            try {
                $upcomingMeetings = Meeting::where('scheduled_for', '>=', now())->count();
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Error getting upcoming meetings: ' . $e->getMessage());
            }
            
            try {
                $activeAnnouncements = Announcement::where('is_active', true)->count();
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Error getting active announcements: ' . $e->getMessage());
            }

            // Member status breakdown (with error handling)
            $memberStatusBreakdown = [];
            try {
                $memberStatusBreakdown = Member::select('contribution_status_label', DB::raw('count(*) as count'))
                    ->where('is_active', true)
                    ->groupBy('contribution_status_label')
                    ->get()
                    ->mapWithKeys(fn($item) => [$item->contribution_status_label ?? 'Unknown' => $item->count]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Error getting member status breakdown: ' . $e->getMessage());
            }

            // Weekly invoice vs payment trend (last 8 weeks) - with error handling
            $invoicePaymentTrend = [];
            try {
                for ($i = 7; $i >= 0; $i--) {
                    $weekStart = Carbon::now()->subWeeks($i)->startOfWeek();
                    $weekEnd = Carbon::now()->subWeeks($i)->endOfWeek();
                    $weekPeriod = $weekStart->format('Y-\WW');
                    
                    $invoiced = Invoice::where('period', $weekPeriod)->sum('amount');
                    $paid = Invoice::where('period', $weekPeriod)
                        ->where('status', 'paid')
                        ->sum('amount');
                    
                    $invoicePaymentTrend[] = [
                        'week' => $weekStart->format('M d'),
                        'invoiced' => (float) $invoiced,
                        'paid' => (float) $paid,
                    ];
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Error getting invoice payment trend: ' . $e->getMessage());
            }

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
                    // Invoice metrics
                    'total_invoices' => $totalInvoices,
                    'pending_invoices' => $pendingInvoices,
                    'paid_invoices' => $paidInvoices,
                    'overdue_invoices' => $overdueInvoices,
                    'invoice_count' => $invoiceCount,
                    'pending_invoice_count' => $pendingInvoiceCount,
                    'collection_rate' => round($collectionRate, 2),
                    // Expense metrics
                    'total_expenses' => $totalExpenses,
                    'pending_expenses' => $pendingExpenses,
                    'monthly_expenses' => $monthlyExpenses,
                    // Engagement metrics
                    'upcoming_meetings' => $upcomingMeetings,
                    'active_announcements' => $activeAnnouncements,
                ],
                'contributions_by_week' => $weeksData,
                'contributions_by_month' => $monthsData,
                'recent_transactions' => $recentTransactions,
                'recent_statements' => $recentStatements,
                'member_status_breakdown' => $memberStatusBreakdown,
                'invoice_payment_trend' => $invoicePaymentTrend,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Dashboard index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Error loading dashboard data',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while loading dashboard',
            ], 500);
        }
    }

    /**
     * Mobile: Get dashboard data for authenticated user's member
     */
    public function mobileIndex(Request $request)
    {
        try {
            $user = $request->user();
            $member = $user->member;
            
            if (!$member) {
                return response()->json([
                    'wallet_balance' => 0,
                    'total_contributions' => 0,
                    'pending_contributions' => 0,
                    'investments' => [],
                    'recent_transactions' => [],
                ]);
            }

            // Get member's wallet balance
            $wallet = $member->wallet;
            $walletBalance = $wallet ? $wallet->balance : 0;

            // Get total contributions - handle case where wallet might not exist
            $totalContributions = 0;
            if ($wallet) {
                $totalContributions = \App\Models\Contribution::where('wallet_id', $wallet->id)
                    ->sum('amount');
            }

            // Get pending contributions (if any)
            $pendingContributions = 0;
            if ($wallet) {
                $pendingContributions = \App\Models\Contribution::where('wallet_id', $wallet->id)
                    ->where('status', 'pending')
                    ->sum('amount');
            }

            // Get investments
            $investments = \App\Models\Investment::where('member_id', $member->id)
                ->with('investmentType')
                ->get();

            // Get recent transactions
            $recentTransactions = \App\Models\Transaction::where('member_id', $member->id)
                ->orderBy('tran_date', 'desc')
                ->limit(10)
                ->get();

            // Return structure compatible with mobile dashboard expectations
            return response()->json([
                'statistics' => [
                    'total_members' => 0, // Not applicable for mobile
                    'unassigned_transactions' => 0,
                    'draft_assignments' => 0,
                    'auto_assigned' => 0,
                    'total_contributions' => $totalContributions,
                    'assigned_contributions' => $totalContributions,
                    'unassigned_contributions' => 0,
                    'statements_processed' => 0,
                ],
                'wallet_balance' => $walletBalance,
                'total_contributions' => $totalContributions,
                'pending_contributions' => $pendingContributions,
                'contributions_by_week' => [],
                'contributions_by_month' => [],
                'investments' => $investments,
                'recent_transactions' => $recentTransactions,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Mobile dashboard error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error loading dashboard data',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    protected function getContributionsByWeek()
    {
        try {
            $weeks = [];
            for ($i = 9; $i >= 0; $i--) {
                $startDate = now()->subWeeks($i)->startOfWeek();
                $endDate = now()->subWeeks($i)->endOfWeek();
                
                $transactionTotal = $this->excludeDuplicateTransactions(
                    Transaction::whereIn('assignment_status', ['auto_assigned', 'manual_assigned', 'draft', 'transferred'])
                        ->where('credit', '>', 0)
                        ->where('is_archived', false)
                        ->whereBetween('tran_date', [$startDate, $endDate])
                )->sum('credit');
                
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
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Error getting contributions by week: ' . $e->getMessage());
            return [];
        }
    }

    protected function getContributionsByMonth()
    {
        try {
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
                
                $transactionTotal = $this->excludeDuplicateTransactions(
                    Transaction::whereIn('assignment_status', ['auto_assigned', 'manual_assigned', 'draft', 'transferred'])
                        ->where('credit', '>', 0)
                        ->where('is_archived', false)
                        ->whereBetween('tran_date', [$startDate, $endDate])
                )->sum('credit');
                
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
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Error getting contributions by month: ' . $e->getMessage());
            return [];
        }
    }
    protected function excludeDuplicateTransactions($query)
    {
        return $query->where(function ($subQuery) {
            $subQuery->whereNull('assignment_status')
                ->orWhere('assignment_status', '!=', 'duplicate');
        });
    }
}

