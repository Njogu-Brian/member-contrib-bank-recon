<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Models\JournalEntry;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AccountingService
{
    public function __construct(
        private readonly DoubleEntryService $doubleEntryService
    ) {
    }

    /**
     * Get trial balance for a period
     */
    public function getTrialBalance(?AccountingPeriod $period = null, ?Carbon $asOfDate = null): array
    {
        $asOfDate = $asOfDate ?? now();
        
        if (!$period) {
            $period = AccountingPeriod::where('start_date', '<=', $asOfDate)
                ->where('end_date', '>=', $asOfDate)
                ->first();
        }

        $accounts = ChartOfAccount::where('is_active', true)
            ->orderBy('type')
            ->orderBy('code')
            ->get();

        $trialBalance = [];
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($accounts as $account) {
            $balance = $this->getAccountBalance($account, $period, $asOfDate);
            
            if (abs($balance) > 0.01) {
                $trialBalance[] = [
                    'account_code' => $account->code,
                    'account_name' => $account->name,
                    'account_type' => $account->type,
                    'debit' => $balance > 0 ? abs($balance) : 0,
                    'credit' => $balance < 0 ? abs($balance) : 0,
                ];

                if ($balance > 0) {
                    $totalDebit += abs($balance);
                } else {
                    $totalCredit += abs($balance);
                }
            }
        }

        return [
            'period' => $period,
            'as_of_date' => $asOfDate->toDateString(),
            'accounts' => $trialBalance,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
        ];
    }

    /**
     * Get account balance
     */
    protected function getAccountBalance(ChartOfAccount $account, ?AccountingPeriod $period, Carbon $asOfDate): float
    {
        $query = GeneralLedger::where('account_id', $account->id)
            ->where('entry_date', '<=', $asOfDate);

        if ($period) {
            $query->where('period_id', $period->id);
        }

        $lastEntry = $query->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->first();

        if (!$lastEntry) {
            return 0;
        }

        // Account type determines balance calculation
        if (in_array($account->type, ['asset', 'expense'])) {
            return $lastEntry->running_balance;
        } else {
            return -$lastEntry->running_balance; // Liability, equity, revenue are credit normal
        }
    }

    /**
     * Get Profit & Loss statement
     */
    public function getProfitAndLoss(?AccountingPeriod $period = null, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        if ($period) {
            $startDate = $period->start_date;
            $endDate = $period->end_date;
        } else {
            $startDate = $startDate ?? now()->startOfMonth();
            $endDate = $endDate ?? now()->endOfMonth();
        }

        $revenue = $this->getAccountsTotal('revenue', $startDate, $endDate);
        $expenses = $this->getAccountsTotal('expense', $startDate, $endDate);
        $netIncome = $revenue - $expenses;

        return [
            'period' => $period,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'revenue' => $revenue,
            'expenses' => $expenses,
            'net_income' => $netIncome,
        ];
    }

    /**
     * Get Cash Flow statement
     */
    public function getCashFlow(?AccountingPeriod $period = null, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        if ($period) {
            $startDate = $period->start_date;
            $endDate = $period->end_date;
        } else {
            $startDate = $startDate ?? now()->startOfMonth();
            $endDate = $endDate ?? now()->endOfMonth();
        }

        // Operating activities (simplified - contributions, expenses)
        $operatingInflows = GeneralLedger::whereHas('account', function ($q) {
                $q->where('type', 'revenue');
            })
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->sum('credit');

        $operatingOutflows = GeneralLedger::whereHas('account', function ($q) {
                $q->where('type', 'expense');
            })
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->sum('debit');

        $operatingCashFlow = $operatingInflows - $operatingOutflows;

        // Investing activities (simplified)
        $investingCashFlow = 0; // Placeholder

        // Financing activities (simplified)
        $financingCashFlow = 0; // Placeholder

        $netCashFlow = $operatingCashFlow + $investingCashFlow + $financingCashFlow;

        return [
            'period' => $period,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'operating_activities' => [
                'inflows' => $operatingInflows,
                'outflows' => $operatingOutflows,
                'net' => $operatingCashFlow,
            ],
            'investing_activities' => [
                'net' => $investingCashFlow,
            ],
            'financing_activities' => [
                'net' => $financingCashFlow,
            ],
            'net_cash_flow' => $netCashFlow,
        ];
    }

    /**
     * Get total for account type in date range
     */
    protected function getAccountsTotal(string $accountType, Carbon $startDate, Carbon $endDate): float
    {
        return GeneralLedger::whereHas('account', function ($q) use ($accountType) {
                $q->where('type', $accountType);
            })
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->when($accountType === 'revenue', function ($q) {
                $q->sum('credit');
            }, function ($q) {
                $q->sum('debit');
            });
    }

    /**
     * Get general ledger entries
     */
    public function getGeneralLedger(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = GeneralLedger::with(['account', 'journalEntry', 'period']);

        if (isset($filters['account_id'])) {
            $query->where('account_id', $filters['account_id']);
        }

        if (isset($filters['period_id'])) {
            $query->where('period_id', $filters['period_id']);
        }

        if (isset($filters['start_date'])) {
            $query->where('entry_date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->where('entry_date', '<=', $filters['end_date']);
        }

        return $query->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($filters['per_page'] ?? 50);
    }

    /**
     * Get chart of accounts
     */
    public function getChartOfAccounts(?string $type = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = ChartOfAccount::where('is_active', true);

        if ($type) {
            $query->where('type', $type);
        }

        return $query->orderBy('type')
            ->orderBy('code')
            ->get();
    }
}

