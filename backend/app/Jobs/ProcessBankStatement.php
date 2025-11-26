<?php

namespace App\Jobs;

use App\Models\BankStatement;
use App\Models\Member;
use App\Models\StatementDuplicate;
use App\Models\Transaction;
use App\Models\TransactionMatchLog;
use App\Models\Setting;
use App\Services\MatchingService;
use App\Services\OcrParserService;
use App\Services\TransactionParserService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

class ProcessBankStatement implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public BankStatement $statement
    ) {}

    public function handle(
        OcrParserService $ocrParser,
        MatchingService $matchingService,
        TransactionParserService $parser
    ): void {
        $this->statement->update(['status' => 'processing']);

        try {
            // Step 1: Parse PDF using OCR parser (check if enabled)
            $ocrEnabled = Setting::get('ocr_matching_enabled', '1');
            if ($ocrEnabled !== '1' && $ocrEnabled !== 'true') {
                throw new \Exception('OCR matching is disabled in settings');
            }
            
            $rows = $ocrParser->parsePdf($this->statement->file_path);

            if (empty($rows)) {
                throw new \Exception('No transactions extracted from PDF');
            }

            // Step 2: Normalize and extract data
            $transactions = [];
            $members = Member::where('is_active', true)->get()->toArray();
            $threshold = (float) config('app.ai_matching_threshold', 0.85);

            foreach ($rows as $row) {
                $parsed = $parser->parseParticulars($row['particulars'] ?? '');

                // For Paybill, transaction_code comes from Receipt No. column
                $isPaybillTransaction = isset($row['transaction_code']) && !empty($row['transaction_code']);

                if ($isPaybillTransaction) {
                    $transactionType = 'M-Pesa Paybill';
                    $transactionCode = $row['transaction_code'];
                } else {
                    $transactionCode = $parsed['transaction_code'] ?? null;
                    $transactionType = $parsed['transaction_type'] ?? null;
                }

                $phones = $parsed['phone_numbers'] ?? [];

                // Skip debit-only transactions
                if (($row['debit'] ?? 0) > 0 && ($row['credit'] ?? 0) == 0) {
                    continue;
                }

                // Only process rows with credit value
                if (($row['credit'] ?? 0) == 0) {
                    continue;
                }

                // Create row hash for duplicate detection (date + description + amount)
                $rowHash = $this->fingerprintTransactionRow($row);

                $transactions[] = [
                    'bank_statement_id' => $this->statement->id,
                    'tran_date' => $row['tran_date'] ?? now(),
                    'value_date' => $row['value_date'] ?? null,
                    'particulars' => $row['particulars'] ?? '',
                    'transaction_type' => $transactionType,
                    'credit' => (float) ($row['credit'] ?? 0),
                    'debit' => (float) ($row['debit'] ?? 0),
                    'balance' => isset($row['balance']) ? (float) $row['balance'] : null,
                    'transaction_code' => $transactionCode,
                    'phones' => $phones,
                    'row_hash' => $rowHash,
                    'raw_text' => $row['particulars'] ?? '',
                    'raw_json' => array_merge($row, [
                        'fingerprint' => $rowHash,
                    ]),
                    'assignment_status' => 'unassigned',
                ];
            }

            Log::info('Normalized transactions prepared', [
                'statement_id' => $this->statement->id,
                'count' => count($transactions),
            ]);

            // Step 3: Batch match transactions (check if bulk matching enabled)
            $bulkMatchingEnabled = Setting::get('bulk_bank_enabled', '1');
            if (!empty($transactions) && !empty($members) && ($bulkMatchingEnabled === '1' || $bulkMatchingEnabled === 'true')) {
                $matchData = array_map(function ($tran, $idx) {
                    return [
                        'client_tran_id' => 't_' . $idx,
                        'tran_date' => is_string($tran['tran_date']) ? $tran['tran_date'] : $tran['tran_date']->format('Y-m-d'),
                        'particulars' => $tran['particulars'],
                        'credit' => $tran['credit'],
                        'transaction_code' => $tran['transaction_code'],
                        'phones' => $tran['phones'] ?? [],
                    ];
                }, $transactions, array_keys($transactions));

                $matches = $matchingService->matchBatch($matchData, $members);

                $matchMap = [];
                foreach ($matches as $match) {
                    $tranId = str_replace('t_', '', $match['client_tran_id']);
                    $matchMap[$tranId] = $match;
                }

                DB::beginTransaction();
                try {
                    foreach ($transactions as $idx => $tranData) {
                        $match = $matchMap[$idx] ?? null;

                        if ($match && $match['confidence'] >= $threshold && $match['candidate_member_id']) {
                            $tranData['member_id'] = $match['candidate_member_id'];
                            $tranData['assignment_status'] = 'auto_assigned';
                            $tranData['match_confidence'] = $match['confidence'];
                        }

                        $transaction = Transaction::create($tranData);

                        if ($match) {
                            TransactionMatchLog::create([
                                'transaction_id' => $transaction->id,
                                'member_id' => $match['candidate_member_id'] ?? null,
                                'confidence' => $match['confidence'],
                                'match_tokens' => $match['match_tokens'] ?? [],
                                'match_reason' => $match['match_reason'] ?? '',
                                'source' => 'ai',
                            ]);
                        }
                    }

                    DB::commit();
                } catch (\Exception $e) {
                    DB::rollBack();
                    throw $e;
                }
            } else {
                $this->insertTransactionsWithoutMatching($transactions);
            }

            $this->flagCrossStatementDuplicates();
            $this->flagIntraStatementDuplicates();

            $this->statement->update(['status' => 'completed']);

            Log::info('Statement processing complete', [
                'statement_id' => $this->statement->id,
                'transactions_persisted' => Transaction::where('bank_statement_id', $this->statement->id)->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to process bank statement', [
                'statement_id' => $this->statement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->statement->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    protected function extractTransactionCode(string $text): ?string
    {
        if (preg_match('/\b([A-Z0-9]{6,12})\b/', $text, $matches)) {
            return $matches[1];
        }

        return null;
    }

    protected function extractPhones(string $text): array
    {
        $phones = [];

        if (preg_match_all('/(?:\+?254|0)?(?:7[0-9]|1[0-9])[0-9]{7}/', $text, $matches)) {
            foreach ($matches[0] as $phone) {
                $phone = preg_replace('/^0/', '+254', $phone);
                $phone = preg_replace('/^254/', '+254', $phone);
                if (!str_starts_with($phone, '+')) {
                    $phone = '+254' . $phone;
                }
                $phones[] = $phone;
            }
        }

        return array_unique($phones);
    }

    protected function insertTransactionsWithoutMatching(array $transactions): void
    {
        $bulkPayload = array_map(function (array $tran) {
            if (isset($tran['phones']) && is_array($tran['phones'])) {
                $tran['phones'] = json_encode(array_values($tran['phones']));
            }

            if (isset($tran['raw_json']) && is_array($tran['raw_json'])) {
                $tran['raw_json'] = json_encode($tran['raw_json']);
            }

            return $tran;
        }, $transactions);

        Transaction::insert($bulkPayload);
    }

    protected function flagCrossStatementDuplicates(): void
    {
        $duplicates = Transaction::where('bank_statement_id', $this->statement->id)
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('transactions as prior')
                    ->whereColumn('prior.row_hash', 'transactions.row_hash')
                    ->where('prior.bank_statement_id', '!=', DB::raw('transactions.bank_statement_id'))
                    ->where('prior.id', '<', DB::raw('transactions.id'));
            })
            ->get();

        foreach ($duplicates as $transaction) {
            $existing = Transaction::where('row_hash', $transaction->row_hash)
                ->where('bank_statement_id', '!=', $this->statement->id)
                ->orderBy('tran_date')
                ->first();

            if (! $existing) {
                continue;
            }

            if ($transaction->assignment_status !== 'duplicate') {
                $transaction->assignment_status = 'duplicate';
                $transaction->save();
            }

            StatementDuplicate::updateOrCreate(
                [
                    'bank_statement_id' => $this->statement->id,
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
        }
    }

    protected function flagIntraStatementDuplicates(): void
    {
        $duplicateHashes = Transaction::select('row_hash')
            ->where('bank_statement_id', $this->statement->id)
            ->groupBy('row_hash')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('row_hash');

        foreach ($duplicateHashes as $rowHash) {
            $transactions = Transaction::where('bank_statement_id', $this->statement->id)
                ->where('row_hash', $rowHash)
                ->orderBy('id')
                ->get();

            if ($transactions->count() < 2) {
                continue;
            }

            $primary = $transactions->shift();

            foreach ($transactions as $duplicate) {
                if ($duplicate->assignment_status !== 'duplicate') {
                    $duplicate->assignment_status = 'duplicate';
                    $duplicate->save();
                }

                StatementDuplicate::updateOrCreate(
                    [
                        'bank_statement_id' => $this->statement->id,
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
            }
        }

    }

    protected function fingerprintTransactionRow(array $row): string
    {
        $date = isset($row['tran_date']) && $row['tran_date']
            ? Carbon::parse($row['tran_date'])->toDateString()
            : '';

        $particulars = $this->normalizeParticulars($row['particulars'] ?? '');
        $amount = number_format((float) ($row['credit'] ?? 0), 2, '.', '');

        return sha1(implode('|', [$date, $particulars, $amount]));
    }

    protected function normalizeParticulars(string $value): string
    {
        $normalized = preg_replace('/\s+/', ' ', trim($value));
        return Str::upper($normalized);
    }
}

