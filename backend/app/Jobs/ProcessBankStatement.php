<?php

namespace App\Jobs;

use App\Models\BankStatement;
use App\Models\StatementDuplicate;
use App\Models\Transaction;
use App\Services\OcrParserService;
use App\Services\TransactionParserService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessBankStatement implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public BankStatement $bankStatement
    ) {}

    public function handle(OcrParserService $ocrParser, TransactionParserService $parser): void
    {
        try {
            $this->bankStatement->update(['status' => 'processing']);
            StatementDuplicate::where('bank_statement_id', $this->bankStatement->id)->delete();

            $transactions = $ocrParser->parsePdf($this->bankStatement->file_path);

            $savedCount = 0;
            $duplicateCount = 0;

            foreach ($transactions as $transactionData) {
                // Normalize transaction
                $normalized = $this->normalizeTransaction($transactionData, $parser);

                // Skip transactions with invalid or zero credit AND debit amounts
                // Allow transactions with either credit OR debit (or both)
                $hasCredit = ($normalized['credit'] ?? 0) > 0;
                $hasDebit = ($normalized['debit'] ?? 0) > 0;
                
                if (!$hasCredit && !$hasDebit) {
                    continue;
                }

                // DISABLED: Duplicate detection during parsing removed per user request
                // ALL transactions are now saved to transactions table
                // Duplicate detection will happen ONLY during auto-assign process
                // This ensures:
                // 1. Total credits match PDF statement (e.g., KES 913,600)
                // 2. All transactions available for accurate narrative extraction
                // 3. Duplicates only archived when user clicks auto-assign

                // Create row hash for future duplicate detection (during auto-assign)
                $rowHash = $this->createRowHash($normalized);

                // All transactions default to unassigned
                $assignmentStatus = 'unassigned';
                
                // Store transaction
                Transaction::create([
                    'bank_statement_id' => $this->bankStatement->id,
                    'tran_date' => $normalized['tran_date'],
                    'value_date' => $normalized['value_date'] ?? $normalized['tran_date'],
                    'particulars' => $normalized['particulars'],
                    'transaction_type' => $normalized['transaction_type'],
                    'credit' => $normalized['credit'] ?? 0,
                    'debit' => $normalized['debit'] ?? 0,
                    'balance' => $normalized['balance'] ?? null,
                    'transaction_code' => $normalized['transaction_code'],
                    'phones' => $normalized['phones'],
                    'row_hash' => $rowHash,
                    'raw_text' => $normalized['particulars'],
                    'raw_json' => $transactionData,
                    'assignment_status' => $assignmentStatus,
                ]);

                $savedCount++;
            }

            $this->bankStatement->update([
                'status' => 'completed',
                'raw_metadata' => [
                    'transactions_found' => count($transactions),
                    'transactions_saved' => $savedCount,
                    'duplicates_skipped' => $duplicateCount,
                ],
            ]);

            Log::info("Bank statement processed successfully", [
                'statement_id' => $this->bankStatement->id,
                'saved' => $savedCount,
                'duplicates' => $duplicateCount,
            ]);

        } catch (\Exception $e) {
            $this->bankStatement->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error("Bank statement processing failed", [
                'statement_id' => $this->bankStatement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    protected function normalizeTransaction(array $data, TransactionParserService $parser): array
    {
        $particulars = $data['particulars'] ?? '';
        $parsed = $parser->parseParticulars($particulars);

        // Validate and sanitize credit amount
        $credit = floatval($data['credit'] ?? 0);
        // Max value for decimal(15,2) is 999999999999999.99
        // But be more conservative - reject anything over 1 billion
        if ($credit > 1000000000 || $credit < 0) {
            Log::warning("Invalid credit amount detected", [
                'credit' => $credit,
                'particulars' => $particulars,
                'raw_data' => $data,
            ]);
            $credit = 0;
        }

        // Validate and sanitize debit amount
        $debit = floatval($data['debit'] ?? 0);
        if ($debit > 1000000000 || $debit < 0) {
            Log::warning("Invalid debit amount detected", [
                'debit' => $debit,
                'particulars' => $particulars,
                'raw_data' => $data,
            ]);
            $debit = 0;
        }

        // Validate balance
        $balance = null;
        if (isset($data['balance'])) {
            $balance = floatval($data['balance']);
            if ($balance > 1000000000 || $balance < -1000000000) {
                $balance = null;
            }
        }

        return [
            'tran_date' => $data['tran_date'] ?? now()->toDateString(),
            'value_date' => $data['value_date'] ?? $data['tran_date'] ?? now()->toDateString(),
            'particulars' => $particulars,
            'transaction_type' => $parsed['transaction_type'],
            'credit' => $credit,
            'debit' => $debit,
            'balance' => $balance,
            'transaction_code' => $parsed['transaction_code'] ?? $data['transaction_code'] ?? null,
            'phones' => $parsed['phones'],
        ];
    }

    protected function createRowHash(array $transaction): string
    {
        $normalizedParticulars = $this->normalizeParticularsForDuplicate($transaction['particulars'] ?? '');

        // Duplicate detection based ONLY on: value_date + narrative/particulars + credit
        // Do NOT use remarks, debit, or transaction_code
        $hashString = sprintf(
            '%s|%s|%s',
            $transaction['value_date'] ?? $transaction['tran_date'],
            $normalizedParticulars,
            $transaction['credit']
        );

        return hash('sha256', $hashString);
    }

    protected function recordDuplicate(string $reason, array $transactionData, array $normalized, ?Transaction $existing = null): void
    {
        try {
            $pageNumber = $transactionData['page_number'] ?? $transactionData['page'] ?? null;

            StatementDuplicate::create([
                'bank_statement_id' => $this->bankStatement->id,
                'transaction_id' => $existing?->id,
                'page_number' => $pageNumber,
                'transaction_code' => $normalized['transaction_code'] ?? null,
                'tran_date' => $normalized['tran_date'] ?? null,
                'credit' => $normalized['credit'] ?? null,
                'debit' => $normalized['debit'] ?? null,
                'duplicate_reason' => $reason,
                'particulars_snapshot' => $normalized['particulars'] ?? null,
                'metadata' => [
                    'existing_transaction_id' => $existing?->id,
                    'existing_statement_id' => $existing?->bank_statement_id,
                    'existing_assignment_status' => $existing?->assignment_status,
                    'source_row_hash' => $existing?->row_hash,
                    'raw_transaction' => $transactionData,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to record duplicate transaction', [
                'statement_id' => $this->bankStatement->id,
                'reason' => $reason,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function normalizeParticularsForDuplicate(?string $value): string
    {
        $value = $value ?? '';
        $value = preg_replace("/\s+/u", ' ', trim($value));
        return mb_strtolower($value);
    }
}

