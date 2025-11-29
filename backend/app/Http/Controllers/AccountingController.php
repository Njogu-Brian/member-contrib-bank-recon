<?php

namespace App\Http\Controllers;

use App\Models\AccountingPeriod;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Services\AccountingService;
use App\Services\DoubleEntryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountingController extends Controller
{
    public function __construct(
        private readonly DoubleEntryService $doubleEntryService,
        private readonly AccountingService $accountingService
    ) {
    }

    /**
     * Create a journal entry
     */
    public function createJournalEntry(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_date' => 'required|date',
            'description' => 'required|string|max:500',
            'reference_type' => 'nullable|string',
            'reference_id' => 'nullable|integer',
            'lines' => 'required|array|min:2',
            'lines.*.account_id' => 'required|exists:chart_of_accounts,id',
            'lines.*.debit' => 'required_without:lines.*.credit|numeric|min:0',
            'lines.*.credit' => 'required_without:lines.*.debit|numeric|min:0',
            'lines.*.description' => 'nullable|string|max:500',
        ]);

        try {
            $entry = $this->doubleEntryService->createJournalEntry($validated);

            return response()->json([
                'message' => 'Journal entry created successfully',
                'entry' => $entry->load('lines.account'),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create journal entry: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Post journal entry to ledger
     */
    public function postJournalEntry(JournalEntry $entry): JsonResponse
    {
        try {
            $this->doubleEntryService->postJournalEntry($entry);

            return response()->json([
                'message' => 'Journal entry posted successfully',
                'entry' => $entry->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to post journal entry: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get general ledger
     */
    public function getGeneralLedger(Request $request): JsonResponse
    {
        $filters = $request->only([
            'account_id',
            'period_id',
            'start_date',
            'end_date',
            'per_page',
        ]);

        $ledger = $this->accountingService->getGeneralLedger($filters);

        return response()->json($ledger);
    }

    /**
     * Get trial balance
     */
    public function getTrialBalance(Request $request): JsonResponse
    {
        $period = null;
        $asOfDate = null;

        if ($request->has('period_id')) {
            $period = AccountingPeriod::findOrFail($request->period_id);
        }

        if ($request->has('as_of_date')) {
            $asOfDate = \Carbon\Carbon::parse($request->as_of_date);
        }

        $trialBalance = $this->accountingService->getTrialBalance($period, $asOfDate);

        return response()->json($trialBalance);
    }

    /**
     * Get Profit & Loss statement
     */
    public function getProfitAndLoss(Request $request): JsonResponse
    {
        $period = null;
        $startDate = null;
        $endDate = null;

        if ($request->has('period_id')) {
            $period = AccountingPeriod::findOrFail($request->period_id);
        }

        if ($request->has('start_date')) {
            $startDate = \Carbon\Carbon::parse($request->start_date);
        }

        if ($request->has('end_date')) {
            $endDate = \Carbon\Carbon::parse($request->end_date);
        }

        $pl = $this->accountingService->getProfitAndLoss($period, $startDate, $endDate);

        return response()->json($pl);
    }

    /**
     * Get Cash Flow statement
     */
    public function getCashFlow(Request $request): JsonResponse
    {
        $period = null;
        $startDate = null;
        $endDate = null;

        if ($request->has('period_id')) {
            $period = AccountingPeriod::findOrFail($request->period_id);
        }

        if ($request->has('start_date')) {
            $startDate = \Carbon\Carbon::parse($request->start_date);
        }

        if ($request->has('end_date')) {
            $endDate = \Carbon\Carbon::parse($request->end_date);
        }

        $cashFlow = $this->accountingService->getCashFlow($period, $startDate, $endDate);

        return response()->json($cashFlow);
    }

    /**
     * Get chart of accounts
     */
    public function getChartOfAccounts(Request $request): JsonResponse
    {
        $accounts = $this->accountingService->getChartOfAccounts($request->query('type'));

        return response()->json($accounts);
    }
}

