<?php

namespace App\Console\Commands;

use App\Models\BankStatement;
use App\Models\Transaction;
use App\Models\StatementDuplicate;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReanalyzeDuplicates extends Command
{
    protected $signature = 'evimeria:reanalyze-duplicates {--statement-id= : Reanalyze specific statement only}';
    protected $description = 'Reanalyze all transactions to identify duplicates based on date, description, and amount';

    public function handle(): int
    {
        $statementId = $this->option('statement-id');

        $this->info('Reanalyzing duplicate transactions...');
        $this->newLine();

        // Clear existing duplicate flags
        Transaction::where('assignment_status', 'duplicate')->update(['assignment_status' => 'unassigned']);
        StatementDuplicate::truncate();

        $statements = $statementId 
            ? BankStatement::where('id', $statementId)->get()
            : BankStatement::where('status', 'completed')->get();

        $totalDuplicates = 0;

        foreach ($statements as $statement) {
            $this->info("Processing statement: {$statement->filename} (ID: {$statement->id})");

            // Cross-statement duplicates
            $crossStatementDuplicates = Transaction::where('bank_statement_id', $statement->id)
                ->whereExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('transactions as prior')
                        ->whereColumn('prior.row_hash', 'transactions.row_hash')
                        ->where('prior.bank_statement_id', '!=', DB::raw('transactions.bank_statement_id'))
                        ->where('prior.id', '<', DB::raw('transactions.id'));
                })
                ->get();

            foreach ($crossStatementDuplicates as $transaction) {
                $existing = Transaction::where('row_hash', $transaction->row_hash)
                    ->where('bank_statement_id', '!=', $statement->id)
                    ->orderBy('tran_date')
                    ->first();

                if ($existing) {
                    $transaction->update(['assignment_status' => 'duplicate']);

                    StatementDuplicate::updateOrCreate(
                        [
                            'bank_statement_id' => $statement->id,
                            'transaction_id' => $existing->id,
                            'tran_date' => $transaction->tran_date,
                            'transaction_code' => $transaction->transaction_code,
                        ],
                        [
                            'credit' => $transaction->credit,
                            'duplicate_reason' => 'cross_statement',
                            'particulars_snapshot' => $transaction->particulars,
                            'metadata' => [
                                'duplicate_transaction_id' => $transaction->id,
                                'existing_statement_id' => $existing->bank_statement_id,
                            ],
                        ]
                    );

                    $totalDuplicates++;
                }
            }

            // Intra-statement duplicates
            $duplicateHashes = Transaction::select('row_hash')
                ->where('bank_statement_id', $statement->id)
                ->groupBy('row_hash')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('row_hash');

            foreach ($duplicateHashes as $rowHash) {
                $transactions = Transaction::where('bank_statement_id', $statement->id)
                    ->where('row_hash', $rowHash)
                    ->orderBy('id')
                    ->get();

                if ($transactions->count() < 2) {
                    continue;
                }

                $primary = $transactions->shift();

                foreach ($transactions as $duplicate) {
                    $duplicate->update(['assignment_status' => 'duplicate']);

                    StatementDuplicate::updateOrCreate(
                        [
                            'bank_statement_id' => $statement->id,
                            'transaction_id' => $primary->id,
                            'tran_date' => $duplicate->tran_date,
                            'transaction_code' => $duplicate->transaction_code,
                        ],
                        [
                            'credit' => $duplicate->credit,
                            'duplicate_reason' => 'intra_statement',
                            'particulars_snapshot' => $duplicate->particulars,
                            'metadata' => [
                                'duplicate_transaction_id' => $duplicate->id,
                                'existing_statement_id' => $primary->bank_statement_id,
                            ],
                        ]
                    );

                    $totalDuplicates++;
                }
            }

            $this->info("  Found duplicates: " . ($crossStatementDuplicates->count() + $duplicateHashes->count()));
        }

        $this->newLine();
        $this->info("Reanalysis complete! Total duplicates flagged: {$totalDuplicates}");

        return self::SUCCESS;
    }
}

