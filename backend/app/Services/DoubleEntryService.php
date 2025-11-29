<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DoubleEntryService
{
    /**
     * Create a journal entry with double-entry validation
     */
    public function createJournalEntry(array $data): JournalEntry
    {
        return DB::transaction(function () use ($data) {
            // Validate that debits equal credits
            $totalDebit = collect($data['lines'])->sum('debit');
            $totalCredit = collect($data['lines'])->sum('credit');

            if (abs($totalDebit - $totalCredit) > 0.01) {
                throw new \Exception('Journal entry is not balanced. Total debit: ' . $totalDebit . ', Total credit: ' . $totalCredit);
            }

            // Get or create period
            $period = $this->getOrCreatePeriod($data['entry_date'] ?? now());

            // Create journal entry
            $entry = JournalEntry::create([
                'entry_number' => $this->generateEntryNumber(),
                'entry_date' => $data['entry_date'] ?? now(),
                'period_id' => $period->id,
                'description' => $data['description'],
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'created_by' => auth()->id(),
                'is_posted' => false,
            ]);

            // Create journal entry lines
            foreach ($data['lines'] as $lineData) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $lineData['account_id'],
                    'debit' => $lineData['debit'] ?? 0,
                    'credit' => $lineData['credit'] ?? 0,
                    'description' => $lineData['description'] ?? null,
                ]);
            }

            return $entry->fresh('lines');
        });
    }

    /**
     * Post journal entry to general ledger
     */
    public function postJournalEntry(JournalEntry $entry): void
    {
        if ($entry->is_posted) {
            throw new \Exception('Journal entry is already posted');
        }

        if (!$entry->isBalanced()) {
            throw new \Exception('Journal entry is not balanced and cannot be posted');
        }

        DB::transaction(function () use ($entry) {
            foreach ($entry->lines as $line) {
                $this->postToLedger($entry, $line);
            }

            $entry->update([
                'is_posted' => true,
                'posted_at' => now(),
            ]);
        });
    }

    /**
     * Post a line to general ledger
     */
    protected function postToLedger(JournalEntry $entry, JournalEntryLine $line): void
    {
        // Calculate running balance
        $lastBalance = GeneralLedger::where('account_id', $line->account_id)
            ->where('entry_date', '<=', $entry->entry_date)
            ->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->value('running_balance') ?? 0;

        $account = ChartOfAccount::find($line->account_id);
        $balanceChange = $this->calculateBalanceChange($account, $line);

        $runningBalance = $lastBalance + $balanceChange;

        GeneralLedger::create([
            'account_id' => $line->account_id,
            'journal_entry_id' => $entry->id,
            'period_id' => $entry->period_id,
            'entry_date' => $entry->entry_date,
            'debit' => $line->debit,
            'credit' => $line->credit,
            'running_balance' => $runningBalance,
            'reference_type' => $entry->reference_type,
            'reference_id' => $entry->reference_id,
            'description' => $line->description ?? $entry->description,
        ]);
    }

    /**
     * Calculate balance change based on account type
     */
    protected function calculateBalanceChange(ChartOfAccount $account, JournalEntryLine $line): float
    {
        // Asset and expense: debit increases, credit decreases
        // Liability, equity, and revenue: credit increases, debit decreases
        
        if (in_array($account->type, ['asset', 'expense'])) {
            return $line->debit - $line->credit;
        } else {
            return $line->credit - $line->debit;
        }
    }

    /**
     * Get or create accounting period for a date
     */
    protected function getOrCreatePeriod($date): AccountingPeriod
    {
        $date = is_string($date) ? \Carbon\Carbon::parse($date) : $date;
        
        $period = AccountingPeriod::where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->where('is_closed', false)
            ->first();

        if (!$period) {
            // Create monthly period
            $startDate = $date->copy()->startOfMonth();
            $endDate = $date->copy()->endOfMonth();
            
            $period = AccountingPeriod::create([
                'period_name' => $date->format('F Y'),
                'start_date' => $startDate,
                'end_date' => $endDate,
                'is_closed' => false,
            ]);
        }

        return $period;
    }

    /**
     * Generate unique entry number
     */
    protected function generateEntryNumber(): string
    {
        do {
            $number = 'JE-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
        } while (JournalEntry::where('entry_number', $number)->exists());

        return $number;
    }
}

