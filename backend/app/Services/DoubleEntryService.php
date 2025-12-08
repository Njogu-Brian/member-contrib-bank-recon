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
        // Reload entry with lines to ensure we have fresh data
        $entry = $entry->fresh('lines');

        if ($entry->is_posted) {
            throw new \Exception('Journal entry is already posted');
        }

        if (!$entry->isBalanced()) {
            throw new \Exception('Journal entry is not balanced and cannot be posted. Total debit: ' . $entry->total_debit . ', Total credit: ' . $entry->total_credit);
        }

        // Validate entry has lines
        if ($entry->lines->isEmpty()) {
            throw new \Exception('Journal entry must have at least one line to be posted');
        }

        // Validate period exists and is not closed
        if (!$entry->period_id) {
            throw new \Exception('Journal entry must have a valid accounting period');
        }

        $period = AccountingPeriod::find($entry->period_id);
        if (!$period) {
            throw new \Exception("Accounting period with ID {$entry->period_id} not found");
        }

        if ($period->is_closed) {
            throw new \Exception("Cannot post to closed accounting period: {$period->period_name}");
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
        // Validate account exists and is active
        $account = ChartOfAccount::find($line->account_id);
        if (!$account) {
            throw new \Exception("Account with ID {$line->account_id} not found");
        }

        if (!$account->is_active) {
            throw new \Exception("Account {$account->code} ({$account->name}) is not active and cannot be used");
        }

        // Validate period exists
        if (!$entry->period_id) {
            throw new \Exception('Journal entry must have a valid period');
        }

        $period = AccountingPeriod::find($entry->period_id);
        if (!$period) {
            throw new \Exception("Accounting period with ID {$entry->period_id} not found");
        }

        // Validate entry date is within period
        $entryDate = is_string($entry->entry_date) ? \Carbon\Carbon::parse($entry->entry_date) : $entry->entry_date;
        if ($entryDate->lt($period->start_date) || $entryDate->gt($period->end_date)) {
            throw new \Exception("Entry date {$entryDate->toDateString()} is outside the accounting period ({$period->start_date} to {$period->end_date})");
        }

        // Calculate running balance
        $lastBalance = GeneralLedger::where('account_id', $line->account_id)
            ->where('entry_date', '<=', $entryDate)
            ->orderBy('entry_date', 'desc')
            ->orderBy('id', 'desc')
            ->value('running_balance') ?? 0;

        $balanceChange = $this->calculateBalanceChange($account, $line);
        $runningBalance = $lastBalance + $balanceChange;

        // Validate debit and credit are non-negative
        $debit = max(0, (float) ($line->debit ?? 0));
        $credit = max(0, (float) ($line->credit ?? 0));

        // Ensure at least one of debit or credit is non-zero
        if ($debit == 0 && $credit == 0) {
            throw new \Exception('Journal entry line must have either a debit or credit amount');
        }

        GeneralLedger::create([
            'account_id' => $line->account_id,
            'journal_entry_id' => $entry->id,
            'period_id' => $entry->period_id,
            'entry_date' => $entryDate,
            'debit' => $debit,
            'credit' => $credit,
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

