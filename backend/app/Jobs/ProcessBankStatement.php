<?php

namespace App\Jobs;

use App\Models\BankStatement;
use App\Models\Member;
use App\Models\Transaction;
use App\Models\TransactionMatchLog;
use App\Services\MatchingService;
use App\Services\OcrParserService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessBankStatement implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public BankStatement $statement
    ) {}

    public function handle(OcrParserService $ocrParser, MatchingService $matchingService): void
    {
        $this->statement->update(['status' => 'processing']);

        try {
            $filePath = Storage::path($this->statement->file_path);

            // Step 1: Parse PDF using OCR parser
            $rows = $ocrParser->parsePdf($filePath);

            if (empty($rows)) {
                throw new \Exception('No transactions extracted from PDF');
            }

            // Step 2: Normalize and extract data
            $transactions = [];
            $members = Member::where('is_active', true)->get()->toArray();
            $threshold = (float) config('app.ai_matching_threshold', 0.85);

            foreach ($rows as $row) {
                // Extract transaction code and phones
                $transactionCode = $this->extractTransactionCode($row['particulars'] ?? '');
                $phones = $this->extractPhones($row['particulars'] ?? '');

                // Create row hash for duplicate detection
                $rowHash = sha1(
                    ($row['particulars'] ?? '') .
                    ($row['tran_date'] ?? '') .
                    ($row['credit'] ?? 0)
                );

                // Check for duplicates
                $existing = Transaction::where('row_hash', $rowHash)
                    ->orWhere(function ($q) use ($transactionCode, $row) {
                        if ($transactionCode) {
                            $q->where('transaction_code', $transactionCode)
                                ->where('tran_date', $row['tran_date'] ?? null);
                        }
                    })
                    ->first();

                if ($existing) {
                    continue; // Skip duplicate
                }

                $transactions[] = [
                    'bank_statement_id' => $this->statement->id,
                    'tran_date' => $row['tran_date'] ?? now(),
                    'value_date' => $row['value_date'] ?? null,
                    'particulars' => $row['particulars'] ?? '',
                    'credit' => (float) ($row['credit'] ?? 0),
                    'debit' => (float) ($row['debit'] ?? 0),
                    'balance' => isset($row['balance']) ? (float) $row['balance'] : null,
                    'transaction_code' => $transactionCode,
                    'phones' => $phones,
                    'row_hash' => $rowHash,
                    'raw_text' => $row['particulars'] ?? '',
                    'raw_json' => $row,
                    'assignment_status' => 'unassigned',
                ];
            }

            // Step 3: Batch match transactions
            if (!empty($transactions) && !empty($members)) {
                $matchData = array_map(function ($tran) {
                    return [
                        'client_tran_id' => 't_'.uniqid(),
                        'tran_date' => is_string($tran['tran_date']) ? $tran['tran_date'] : $tran['tran_date']->format('Y-m-d'),
                        'particulars' => $tran['particulars'],
                        'credit' => $tran['credit'],
                        'transaction_code' => $tran['transaction_code'],
                        'phones' => $tran['phones'] ?? [],
                    ];
                }, $transactions);

                $matches = $matchingService->matchBatch($matchData, $members);

                // Map matches back to transactions
                $matchMap = [];
                foreach ($matches as $match) {
                    $tranId = str_replace('t_', '', $match['client_tran_id']);
                    $matchMap[$tranId] = $match;
                }

                // Step 4: Save transactions with matches
                DB::beginTransaction();
                try {
                    foreach ($transactions as $idx => $tranData) {
                        $match = $matchMap[$idx] ?? null;

                        if ($match && $match['confidence'] >= $threshold && $match['candidate_member_id']) {
                            $tranData['member_id'] = $match['candidate_member_id'];
                            $tranData['assignment_status'] = 'auto_assigned';
                            $tranData['match_confidence'] = $match['confidence'];
                        } elseif ($match && $match['confidence'] >= 0.5) {
                            $tranData['match_confidence'] = $match['confidence'];
                        }

                        $transaction = Transaction::create($tranData);

                        // Log match
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
                // Save transactions without matching
                Transaction::insert($transactions);
            }

            $this->statement->update(['status' => 'completed']);
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
        // Match patterns like TD41CC9GZ, MPS2547, etc.
        if (preg_match('/\b([A-Z0-9]{6,12})\b/', $text, $matches)) {
            return $matches[1];
        }

        return null;
    }

    protected function extractPhones(string $text): array
    {
        $phones = [];

        // Match Kenyan phone numbers: 0716227320, +254716227320, etc.
        if (preg_match_all('/(?:\+?254|0)?(?:7[0-9]|1[0-9])[0-9]{7}/', $text, $matches)) {
            foreach ($matches[0] as $phone) {
                // Normalize to +254 format
                $phone = preg_replace('/^0/', '+254', $phone);
                $phone = preg_replace('/^254/', '+254', $phone);
                if (!str_starts_with($phone, '+')) {
                    $phone = '+254'.$phone;
                }
                $phones[] = $phone;
            }
        }

        return array_unique($phones);
    }
}

