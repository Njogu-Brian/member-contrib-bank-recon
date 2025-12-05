<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\StatementDuplicate;
use App\Models\Transaction;
use App\Models\TransactionMatchLog;
use App\Models\TransactionSplit;
use App\Models\TransactionTransfer;
use App\Services\MatchingService;
use App\Services\TransactionParserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TransactionController extends Controller
{
    protected $parser;

    public function __construct(TransactionParserService $parser)
    {
        $this->parser = $parser;
    }

    public function index(Request $request)
    {
        $query = Transaction::with(['member', 'bankStatement', 'matchLogs']);

        // Handle archived filter
        if ($request->has('archived')) {
            // Accept boolean, string, or numeric representations
            $archivedValue = $request->archived;
            if (is_string($archivedValue)) {
                $archived = in_array(strtolower($archivedValue), ['true', '1', 'yes'], true);
            } elseif (is_numeric($archivedValue)) {
                $archived = (int) $archivedValue === 1;
            } else {
                $archived = (bool) $archivedValue;
            }
            $query->where('is_archived', $archived ? 1 : 0);
        } elseif ($request->filled('include_archived') && $request->boolean('include_archived')) {
            // Include both archived and non-archived
            // Don't filter by is_archived
        } elseif (!$request->filled('bank_statement_id')) {
            // Default: show only non-archived transactions (unless viewing a specific statement)
            $query->where('is_archived', false);
        }

        // Filters - only apply if value is not empty
        if ($request->filled('status')) {
            $query->where('assignment_status', $request->status);
        }

        if ($request->filled('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->filled('bank_statement_id')) {
            $query->where('bank_statement_id', $request->bank_statement_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('particulars', 'like', "%{$search}%")
                  ->orWhere('transaction_code', 'like', "%{$search}%")
                  ->orWhereHas('member', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('date_from')) {
            $query->where('tran_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('tran_date', '<=', $request->date_to);
        }

        // Handle sorting
        $sortBy = $request->get('sort_by', 'tran_date');
        $sortOrder = $request->get('sort_order', 'desc');
        
        if ($sortBy === 'amount' || $sortBy === 'credit') {
            $query->orderBy('credit', $sortOrder);
        } else {
            $query->orderBy($sortBy, $sortOrder);
        }

        $transactions = $query->paginate($request->get('per_page', 20));
        
        // For draft transactions, load draft members
        if ($request->filled('status') && $request->status === 'draft') {
            foreach ($transactions->items() as $transaction) {
                if ($transaction->draft_member_ids && is_array($transaction->draft_member_ids)) {
                    $transaction->draft_members = \App\Models\Member::whereIn('id', $transaction->draft_member_ids)->get();
                }
            }
        }
        
        return response()->json($transactions);
    }

    public function show(Transaction $transaction)
    {
        $transaction->load(['member', 'bankStatement', 'matchLogs.member', 'splits.member']);
        return response()->json($transaction);
    }

    public function assign(Request $request, Transaction $transaction)
    {
        if ($transaction->is_archived) {
            return response()->json([
                'message' => 'Cannot assign an archived transaction',
            ], 422);
        }

        $request->validate([
            'member_id' => 'required|exists:members,id',
        ]);

        $oldMemberId = $transaction->member_id;
        $newMemberId = $request->member_id;
        $transactionAmount = (float) ($transaction->credit > 0 ? $transaction->credit : $transaction->debit);

        // If reassigning to a different member, handle as transfer
        if ($oldMemberId && $oldMemberId != $newMemberId) {
            // Delete existing splits and transfers first
            $transaction->splits()->delete();
            $transaction->transfers()->delete();

            // Create transfer record
            TransactionTransfer::create([
                'transaction_id' => $transaction->id,
                'from_member_id' => $oldMemberId,
                'initiated_by' => optional($request->user())->id,
                'mode' => 'single',
                'total_amount' => $transactionAmount,
                'notes' => 'Reassigned via assign endpoint',
                'metadata' => [
                    'previous_member_id' => $oldMemberId,
                    'new_member_id' => $newMemberId,
                    'previous_assignment_status' => $transaction->assignment_status,
                ],
            ]);

            // Create match log for new assignment
            TransactionMatchLog::create([
                'transaction_id' => $transaction->id,
                'member_id' => $newMemberId,
                'confidence' => 1.0,
                'match_reason' => "Reassigned from member {$oldMemberId} to member {$newMemberId}",
                'source' => 'manual',
                'user_id' => $request->user()->id,
            ]);
        } else {
            // New assignment or same member - just create match log
            TransactionMatchLog::create([
                'transaction_id' => $transaction->id,
                'member_id' => $newMemberId,
                'confidence' => 1.0,
                'match_reason' => 'Manual assignment',
                'source' => 'manual',
                'user_id' => $request->user()->id,
            ]);
        }

        // Update transaction
        $transaction->update([
            'member_id' => $newMemberId,
            'assignment_status' => 'manual_assigned',
            'match_confidence' => 1.0,
            'draft_member_ids' => null,
        ]);

        $transaction->load(['member', 'bankStatement', 'splits.member']);

        return response()->json($transaction);
    }

    public function split(Request $request, Transaction $transaction)
    {
        if ($transaction->is_archived) {
            return response()->json([
                'message' => 'Cannot split an archived transaction',
            ], 422);
        }

        $request->validate([
            'splits' => 'required|array|min:1',
            'splits.*.member_id' => 'required|exists:members,id',
            'splits.*.amount' => 'required|numeric|min:0.01',
            'splits.*.notes' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:500',
        ]);

        $totalAmount = collect($request->splits)->sum('amount');
        $transactionAmount = $transaction->credit > 0 ? $transaction->credit : $transaction->debit;

        if (abs($totalAmount - $transactionAmount) > 0.01) {
            return response()->json([
                'message' => 'Split amounts must sum to transaction amount',
                'expected' => $transactionAmount,
                'provided' => $totalAmount,
            ], 422);
        }

        DB::transaction(function () use ($transaction, $request, $totalAmount) {
            $oldMemberId = $transaction->member_id;
            $transaction->splits()->delete();
            $transaction->transfers()->delete();

            $transfer = TransactionTransfer::create([
                'transaction_id' => $transaction->id,
                'from_member_id' => $oldMemberId,
                'initiated_by' => optional($request->user())->id,
                'mode' => 'split',
                'total_amount' => $totalAmount,
                'notes' => $request->input('notes'),
                'metadata' => [
                    'entries' => collect($request->splits)->map(function ($split) {
                        return [
                            'member_id' => $split['member_id'],
                            'amount' => $split['amount'],
                            'notes' => $split['notes'] ?? null,
                        ];
                    })->toArray(),
                ],
            ]);

            foreach ($request->splits as $split) {
                TransactionSplit::create([
                    'transaction_id' => $transaction->id,
                    'member_id' => $split['member_id'],
                    'amount' => $split['amount'],
                    'notes' => $split['notes'] ?? null,
                    'transfer_id' => $transfer->id,
                ]);

                TransactionMatchLog::create([
                    'transaction_id' => $transaction->id,
                    'member_id' => $split['member_id'],
                    'confidence' => 1.0,
                    'match_reason' => "Split share of {$split['amount']}" . ($request->input('notes') ? ": {$request->input('notes')}" : ''),
                    'source' => 'manual',
                    'user_id' => optional($request->user())->id,
                ]);
            }

            // If only one recipient in split, assign to that member; otherwise set to null
            // This ensures the original member doesn't get double-counted
            $recipientIds = collect($request->splits)->pluck('member_id')->unique();
            $newMemberId = $recipientIds->count() === 1 ? $recipientIds->first() : null;

            $transaction->update([
                'member_id' => $newMemberId,
                'assignment_status' => 'transferred',
                'draft_member_ids' => null,
            ]);
        });

        $transaction->load(['splits.member']);

        return response()->json($transaction);
    }

    public function autoAssign(Request $request, MatchingService $matchingService)
    {
        // Optionally purge debit rows that occasionally sneak in
        Transaction::where('debit', '>', 0)
            ->where('is_archived', false)
            ->delete();

        $transactions = Transaction::whereIn('assignment_status', ['unassigned', 'draft', 'flagged'])
            ->where('is_archived', false)
            ->where('credit', '>', 0)
            ->with(['member', 'bankStatement'])
            ->get();

        if ($transactions->isEmpty()) {
            return response()->json([
                'message' => 'No transactions eligible for auto-assignment',
                'auto_assigned' => 0,
                'draft_assigned' => 0,
                'unassigned' => Transaction::where('assignment_status', 'unassigned')
                    ->where('is_archived', false)
                    ->where('credit', '>', 0)
                    ->count(),
                'total_processed' => 0,
                'duplicates_archived' => 0,
            ]);
        }

        // Check for duplicates BEFORE auto-assignment
        // Duplicates are identified by: value_date + particulars + credit (100% match)
        $duplicatesArchived = $this->checkAndArchiveDuplicates($transactions);
        
        // Refresh transactions to exclude any that were just archived
        $transactions = $transactions->filter(function ($transaction) {
            return !$transaction->is_archived;
        });
        
        // Re-fetch from database to ensure we have the latest state
        $transactions = Transaction::whereIn('id', $transactions->pluck('id'))
            ->where('is_archived', false)
            ->whereIn('assignment_status', ['unassigned', 'draft', 'flagged'])
            ->where('credit', '>', 0)
            ->with(['member', 'bankStatement'])
            ->get();

        if ($transactions->isEmpty()) {
            return response()->json([
                'message' => 'No transactions eligible for auto-assignment after duplicate check',
                'auto_assigned' => 0,
                'draft_assigned' => 0,
                'unassigned' => Transaction::where('assignment_status', 'unassigned')
                    ->where('is_archived', false)
                    ->where('credit', '>', 0)
                    ->count(),
                'total_processed' => 0,
                'duplicates_archived' => $duplicatesArchived,
            ]);
        }

        $members = Member::where('is_active', true)->get();

        $matchingResults = [];
        if ($matchingService->isAvailable()) {
            $membersPayload = $members->map(function ($member) {
                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'phone' => $member->phone,
                    'member_code' => $member->member_code,
                    'member_number' => $member->member_number,
                ];
            })->values()->toArray();

            foreach ($transactions->chunk(50) as $chunk) {
                $chunkPayload = $chunk->map(function ($transaction) {
                    return [
                        'id' => $transaction->id,
                        'tran_date' => $transaction->tran_date?->format('Y-m-d'),
                        'particulars' => $transaction->particulars,
                        'credit' => $transaction->credit,
                        'transaction_code' => $transaction->transaction_code,
                    ];
                })->values()->toArray();

                $response = $matchingService->matchBatch($chunkPayload, $membersPayload);
                foreach ($response as $result) {
                    if (isset($result['transaction_id'])) {
                        $matchingResults[$result['transaction_id']] = $result['matches'] ?? [];
                    }
                }
            }
        }

        $autoAssigned = 0;
        $draftAssigned = 0;
        $processed = 0;

        foreach ($transactions as $transaction) {
            $processed++;
            $parsed = $this->parser->parseParticulars($transaction->particulars);
            if ($transaction->transaction_type) {
                $parsed['transaction_type'] = $transaction->transaction_type;
            }

            $match = null;
            if (!empty($matchingResults[$transaction->id])) {
                $match = $this->evaluateMatchingServiceResult($matchingResults[$transaction->id]);
            }

            $heuristicMatch = $this->findMatch($transaction, $parsed, $members);

            if ($heuristicMatch) {
                if (!$match) {
                    $match = $heuristicMatch;
                } elseif ($match['status'] !== 'auto_assigned' && $heuristicMatch['status'] === 'auto_assigned') {
                    // Upgrade to auto assignment if heuristics are decisive
                    $match = $heuristicMatch;
                } elseif ($match['status'] !== 'auto_assigned' && $heuristicMatch['status'] !== 'auto_assigned') {
                    $currentConfidence = (float) ($match['confidence'] ?? 0);
                    $heuristicConfidence = (float) ($heuristicMatch['confidence'] ?? 0);
                    if ($heuristicConfidence > $currentConfidence) {
                        $match = $heuristicMatch;
                    }
                }
            }

            if (!$match) {
                continue;
            }

            $transaction->update([
                'member_id' => $match['member_id'],
                'assignment_status' => $match['status'],
                'match_confidence' => $match['confidence'],
                'draft_member_ids' => $match['draft_member_ids'] ?? null,
            ]);

            TransactionMatchLog::create([
                'transaction_id' => $transaction->id,
                'member_id' => $match['member_id'],
                'confidence' => $match['confidence'],
                'match_reason' => $match['reason'],
                'source' => 'auto',
            ]);

            if ($match['status'] === 'auto_assigned') {
                $autoAssigned++;
            } else {
                $draftAssigned++;
            }
        }

        $unassigned = Transaction::where('assignment_status', 'unassigned')
            ->where('is_archived', false)
            ->where('credit', '>', 0)
            ->count();

        return response()->json([
            'message' => 'Auto-assignment completed',
            'auto_assigned' => $autoAssigned,
            'draft_assigned' => $draftAssigned,
            'unassigned' => $unassigned,
            'total_processed' => $processed,
            'duplicates_archived' => $duplicatesArchived,
        ]);
    }

    /**
     * Check for duplicate transactions and archive the older ones.
     * Duplicates are identified by: value_date + particulars + credit (100% exact match)
     * The transaction from the latest statement is kept, older ones are archived.
     *
     * @param \Illuminate\Database\Eloquent\Collection $transactions
     * @return int Number of duplicates archived
     */
    protected function checkAndArchiveDuplicates($transactions): int
    {
        $duplicatesArchived = 0;
        $processedKeys = []; // Track processed duplicate groups to avoid double-processing
        
        // Get all unarchived transactions for duplicate checking
        $allTransactions = Transaction::where('is_archived', false)
            ->where('credit', '>', 0)
            ->with('bankStatement')
            ->get();
        
        // Group all transactions by value_date + particulars + credit
        $grouped = $allTransactions->groupBy(function ($transaction) {
            // Use value_date if available, otherwise fall back to tran_date
            $date = $transaction->value_date ?? $transaction->tran_date;
            if (!$date) {
                return null; // Skip transactions without a date
            }
            
            // Normalize particulars (trim whitespace for exact match)
            $particulars = trim($transaction->particulars ?? '');
            if (empty($particulars)) {
                return null; // Skip transactions without particulars
            }
            
            // Credit amount (exact match required)
            $credit = number_format((float)($transaction->credit ?? 0), 2, '.', '');
            
            // Create unique key: date|particulars|credit
            return $date->format('Y-m-d') . '|' . $particulars . '|' . $credit;
        })->filter(); // Remove null keys
        
        foreach ($grouped as $key => $group) {
            // Only process groups with more than one transaction (duplicates)
            if ($group->count() <= 1) {
                continue;
            }
            
            // Skip if already processed
            if (isset($processedKeys[$key])) {
                continue;
            }
            
            $processedKeys[$key] = true;
            
            // Sort by statement ID (higher ID = newer statement)
            // Keep the transaction from the latest statement
            $sorted = $group->sortByDesc(function ($transaction) {
                return $transaction->bank_statement_id ?? 0;
            });
            
            $latest = $sorted->first();
            $toArchive = $sorted->skip(1);
            
            foreach ($toArchive as $duplicate) {
                // Skip if already archived (safety check)
                if ($duplicate->is_archived) {
                    continue;
                }
                
                // Archive the older duplicate
                $duplicate->update([
                    'assignment_status' => 'duplicate',
                    'is_archived' => true,
                ]);
                
                // Record in statement_duplicates table
                StatementDuplicate::updateOrCreate(
                    [
                        'bank_statement_id' => $duplicate->bank_statement_id,
                        'transaction_id' => $latest->id,
                        'tran_date' => $duplicate->tran_date,
                        'transaction_code' => $duplicate->transaction_code,
                    ],
                    [
                        'credit' => $duplicate->credit,
                        'duplicate_reason' => 'auto_assign_duplicate',
                        'particulars_snapshot' => $duplicate->particulars,
                        'metadata' => [
                            'duplicate_transaction_id' => $duplicate->id,
                            'existing_statement_id' => $latest->bank_statement_id,
                            'match_criteria' => 'value_date_particulars_credit_100_percent',
                        ],
                    ]
                );
                
                $duplicatesArchived++;
                
                Log::info('Duplicate transaction archived during auto-assign', [
                    'duplicate_id' => $duplicate->id,
                    'kept_id' => $latest->id,
                    'value_date' => $duplicate->value_date?->format('Y-m-d') ?? $duplicate->tran_date?->format('Y-m-d'),
                    'particulars' => substr($duplicate->particulars, 0, 100),
                    'credit' => $duplicate->credit,
                ]);
            }
        }
        
        return $duplicatesArchived;
    }

    protected function evaluateMatchingServiceResult(array $matches): ?array
    {
        if (empty($matches)) {
            return null;
        }

        $top = $matches[0];
        if (empty($top['member_id'])) {
            return null;
        }

        $topConfidence = (float) ($top['confidence'] ?? 0);
        $candidateIds = collect($matches)
            ->pluck('member_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        $status = null;

        if ($topConfidence >= 0.95) {
            if (isset($matches[1])) {
                $secondConfidence = (float) ($matches[1]['confidence'] ?? 0);
                if ($secondConfidence >= 0.9) {
                    $status = 'draft';
                }
            }
            $status = $status ?? 'auto_assigned';
        } elseif ($topConfidence >= 0.75) {
            $status = 'draft';
        } else {
            return null;
        }

        return [
            'member_id' => $top['member_id'],
            'status' => $status,
            'confidence' => min(1.0, round($topConfidence, 2)),
            'reason' => $top['reason'] ?? 'Matching service suggestion',
            'draft_member_ids' => $status === 'draft' ? $candidateIds : null,
        ];
    }

    protected function findMatch(Transaction $transaction, array $parsed, $members): ?array
    {
        // Use stored transaction_type if available, otherwise use parsed one
        $transactionType = $transaction->transaction_type ?? $parsed['transaction_type'] ?? null;
        if ($transactionType) {
            $parsed['transaction_type'] = $transactionType;
        }

        $normalizedParticulars = strtolower(preg_replace('/\s+/', ' ', (string) $transaction->particulars));
        $digitsOnlyParticulars = preg_replace('/\D+/', '', (string) $transaction->particulars);
        $membersWithNameInParticulars = [];

        $isMpesaPaybill = ($parsed['transaction_type'] ?? null) === 'M-Pesa Paybill';
        
        // Strategy 1: Name + Phone Match (100% auto-assign)
        // Full phone (bank) OR last 3 digits (M-Pesa Paybill) + name = 100% auto-assign
        if (!empty($parsed['member_name'])) {
            $namePhoneMatches = [];
            $transactionPhones = collect($parsed['phones'] ?? [])
                ->map(fn($phone) => $this->parser->normalizePhone($phone))
                ->filter()
                ->unique()
                ->values()
                ->toArray();
            
            foreach ($members as $member) {
                $memberPhoneNormalized = $this->parser->normalizePhone($member->phone);
                if ($memberPhoneNormalized && $this->phoneAppearsInText($digitsOnlyParticulars, $memberPhoneNormalized)) {
                    return [
                        'member_id' => $member->id,
                        'status' => 'auto_assigned',
                        'confidence' => 1.0,
                        'reason' => 'Full phone match in particulars',
                    ];
                }

                // Check name match - count matching words with fuzzy matching
                // Normalize names: remove extra spaces, convert to lowercase
                $txName = preg_replace('/\s+/', ' ', strtolower(trim($parsed['member_name'])));
                $memName = preg_replace('/\s+/', ' ', strtolower(trim($member->name)));
                $fullNameSimilarityPercent = 0;
                similar_text($txName, $memName, $fullNameSimilarityPercent);
                $fullNameSimilarity = $fullNameSimilarityPercent / 100;
                
                // Split into words (filter out short words like "de", "van", etc.)
                $nameWords = array_filter(explode(' ', $txName), function($w) { return strlen($w) > 2; });
                $memberNameWords = array_filter(explode(' ', $memName), function($w) { return strlen($w) > 2; });
                $matchedWordsInParticulars = array_filter($memberNameWords, function ($word) use ($normalizedParticulars) {
                    return $word && strpos($normalizedParticulars, $word) !== false;
                });
                if (count($matchedWordsInParticulars) >= 2) {
                    $membersWithNameInParticulars[] = $member;
                }
                
                // Exact word matches (order-independent)
                $matchingWords = array_intersect($nameWords, $memberNameWords);
                $nameMatchCount = count($matchingWords);
                
                // Fuzzy word matching for similar names (e.g., KINYANJUI vs KINYAJUI)
                // Check all transaction words against all member words (order-independent)
                $fuzzyMatches = 0;
                $matchedTxWords = [];
                $matchedMemWords = [];
                
                foreach ($nameWords as $txWord) {
                    // Skip if already matched exactly
                    if (in_array($txWord, $matchingWords)) {
                        continue;
                    }
                    
                    foreach ($memberNameWords as $memWord) {
                        // Skip if already matched exactly
                        if (in_array($memWord, $matchingWords)) {
                            continue;
                        }
                        
                        // Skip if already matched via fuzzy
                        if (in_array($txWord, $matchedTxWords) || in_array($memWord, $matchedMemWords)) {
                            continue;
                        }
                        
                        // Use similar_text for fuzzy matching
                        similar_text($txWord, $memWord, $percent);
                        // If similarity is 85% or more (or loose partial match), consider it a match
                        if ($percent >= 85 || $this->wordsLooselyMatch($txWord, $memWord)) {
                            $fuzzyMatches++;
                            $matchedTxWords[] = $txWord;
                            $matchedMemWords[] = $memWord;
                            break; // Count each transaction word only once
                        }
                    }
                }
                
                // Total match count includes both exact and fuzzy matches
                // This counts ANY matching words regardless of order
                $totalMatchCount = $nameMatchCount + $fuzzyMatches;
                
                // Need at least one name word match (exact or fuzzy)
                if ($totalMatchCount === 0) {
                    continue;
                }
                
                // Check for exact name match (all words match, order-independent)
                // Consider it exact if all transaction words match OR all member words match
                // This handles cases like "JOHN MWANGI" matching "MWANGI JOHN"
                $exactNameMatch = false;
                
                // If all words from transaction match member words (order-independent)
                if ($totalMatchCount >= count($nameWords) && count($nameWords) > 0) {
                    $exactNameMatch = true;
                }
                // OR if all words from member match transaction words (order-independent)
                elseif ($totalMatchCount >= count($memberNameWords) && count($memberNameWords) > 0) {
                    $exactNameMatch = true;
                }
                // Also check for very similar names (fuzzy match on full name)
                else {
                    // If names are 90%+ similar, treat as exact match
                    if ($fullNameSimilarityPercent >= 90) {
                        $exactNameMatch = true;
                    }
                }
                
                $phoneMatch = false;
                $phoneMatchType = null;
                
                // Check full phone match (for bank transactions)
                // CRITICAL: For bank transactions, ONLY check full phone (not last 3 digits)
                $isBankTransaction = in_array($parsed['transaction_type'] ?? '', ['Bank Transaction', 'RTGS', 'EAZZYPAY', 'USSD', 'EAZZY-FUNDS', 'MPS']);
                
                // Also handle masked phone formats (2547*** or 07****)
                if (!empty($parsed['phones']) && $member->phone) {
                    $memberPhone = $this->parser->normalizePhone($member->phone);
                    
                    foreach ($parsed['phones'] as $txPhone) {
                        // Handle masked phone formats (2547*** or 07****)
                        if (preg_match('/^masked_(2547|07)_(\d+)$/', $txPhone, $maskedParts)) {
                            // Masked phone: extract suffix and match against member phone
                            $suffix = $maskedParts[2];
                            $prefix = $maskedParts[1];
                            
                            if ($memberPhone && strlen($memberPhone) >= strlen($suffix)) {
                                $memberSuffix = substr($memberPhone, -strlen($suffix));
                                if ($memberSuffix === $suffix) {
                                    // Check if prefix matches (2547 or 07)
                                    if ($prefix === '2547' && substr($memberPhone, 0, 4) === '2547') {
                                        $phoneMatch = true;
                                        $phoneMatchType = 'masked_full';
                                        break;
                                    } elseif ($prefix === '07') {
                                        // 07**** format - check if member phone starts with 2547 (07 converted)
                                        if (substr($memberPhone, 0, 4) === '2547' || substr($memberPhone, 0, 2) === '07') {
                                            $phoneMatch = true;
                                            $phoneMatchType = 'masked_full';
                                            break;
                                        }
                                    }
                                }
                            }
                            continue;
                        }
                        
                        // Regular full phone match
                        $normalizedTxPhone = $this->parser->normalizePhone($txPhone);
                        
                        if ($normalizedTxPhone && $memberPhone) {
                            if ($normalizedTxPhone === $memberPhone) {
                                $phoneMatch = true;
                                $phoneMatchType = 'full';
                                break;
                            }
                        }
                    }
                }
                
                // CRITICAL: For M-Pesa Paybill, check last 3 digits ONLY if name also matches
                // M-Pesa Paybill requires BOTH last 3 digits AND at least one name match
                $isMpesaPaybill = ($parsed['transaction_type'] ?? null) === 'M-Pesa Paybill';
                
                if (!$phoneMatch && $isMpesaPaybill && !empty($parsed['last_3_phone_digits']) && $member->phone) {
                    // For M-Pesa Paybill: ONLY check last 3 digits if we already have a name match
                    if ($totalMatchCount >= 1) {
                        $memberPhone = $this->parser->normalizePhone($member->phone);
                        if ($memberPhone && strlen($memberPhone) >= 3) {
                            $memberLast3 = substr($memberPhone, -3);
                            if ($parsed['last_3_phone_digits'] === $memberLast3) {
                                $phoneMatch = true;
                                $phoneMatchType = 'last3';
                            }
                        }
                    }
                    // If no name match, skip last 3 digits check for M-Pesa Paybill
                } elseif (!$phoneMatch && !$isMpesaPaybill && !empty($parsed['last_3_phone_digits']) && $member->phone) {
                    // For non-M-Pesa transactions, we can check last 3 digits (but prefer full phone)
                    $memberPhone = $this->parser->normalizePhone($member->phone);
                    if ($memberPhone && strlen($memberPhone) >= 3) {
                        $memberLast3 = substr($memberPhone, -3);
                        if ($parsed['last_3_phone_digits'] === $memberLast3) {
                            $phoneMatch = true;
                            $phoneMatchType = 'last3';
                        }
                    }
                }
                
                if ($totalMatchCount === 0 && !$phoneMatch) {
                    continue;
                }

                // If name matches and phone matches (full or last 3) = 100% auto-assign
                // CRITICAL: For M-Pesa Paybill, we MUST have BOTH last 3 digits AND name match
                if ($phoneMatch) {
                    // For M-Pesa Paybill: Verify that the member's name words actually appear in the transaction particulars
                    if ($phoneMatchType === 'last3' && $isMpesaPaybill) {
                        // Check if any of the member's name words appear in the transaction particulars
                        $particulars = strtolower($transaction->particulars);
                        $memberNameWordsInParticulars = false;
                        
                        foreach ($memberNameWords as $memWord) {
                            if (strlen($memWord) > 2 && strpos($particulars, $memWord) !== false) {
                                $memberNameWordsInParticulars = true;
                                break;
                            }
                        }
                        
                        // If member's name doesn't appear in particulars, skip this match
                        // M-Pesa Paybill requires BOTH last 3 digits AND name
                        if (!$memberNameWordsInParticulars || $totalMatchCount < 1) {
                            continue;
                        }
                    }
                    
                    $matchScore = ($exactNameMatch ? 1000 : 0)
                        + ($totalMatchCount * 100)
                        + intval($fullNameSimilarity * 100);
                    if ($phoneMatchType === 'full' || $phoneMatchType === 'masked_full') {
                        $matchScore += 50;
                    } elseif ($phoneMatchType === 'last3') {
                        $matchScore += 25;
                    }

                    $namePhoneMatches[] = [
                        'member' => $member,
                        'name_match_count' => $totalMatchCount,
                        'phone_match_type' => $phoneMatchType,
                        'exact_name_match' => $exactNameMatch,
                        'name_similarity' => $fullNameSimilarity,
                        'match_score' => $matchScore,
                    ];
                }
                // CRITICAL: For bank transactions, auto-assign if 2+ names match (even without phone)
                // For M-Pesa Paybill, require BOTH last 3 digits AND name (already handled above)
                elseif ($totalMatchCount >= 2 && $isBankTransaction) {
                    $matchScore = ($exactNameMatch ? 1000 : 0)
                        + ($totalMatchCount * 100)
                        + intval($fullNameSimilarity * 100);

                    $namePhoneMatches[] = [
                        'member' => $member,
                        'name_match_count' => $totalMatchCount,
                        'phone_match_type' => null, // No phone match
                        'exact_name_match' => $exactNameMatch,
                        'name_similarity' => $fullNameSimilarity,
                        'match_score' => $matchScore,
                    ];
                }
            }
            
            if (count($membersWithNameInParticulars) === 1) {
                return [
                    'member_id' => $membersWithNameInParticulars[0]->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => 'Member name appears in particulars',
                ];
            }
            
            // CRITICAL: Prioritize exact name + full phone matches
            // If we have exact name + full phone match, auto-assign immediately (even if others have partial matches)
            $exactNameFullPhoneMatch = collect($namePhoneMatches)->first(function($match) {
                return $match['exact_name_match'] && 
                       ($match['phone_match_type'] === 'full' || $match['phone_match_type'] === 'masked_full');
            });
            
            if ($exactNameFullPhoneMatch) {
                return [
                    'member_id' => $exactNameFullPhoneMatch['member']->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => 'Exact name + full phone match',
                ];
            }
            
            // CRITICAL: All name + full phone matches = 100% confidence (1.0)
            // This handles cases where name matches and phone fully matches, even if others have partial matches
            $nameFullPhoneMatches = collect($namePhoneMatches)->filter(function($match) {
                return ($match['phone_match_type'] === 'full' || $match['phone_match_type'] === 'masked_full');
            });
            
            if ($nameFullPhoneMatches->isNotEmpty()) {
                $exactFullPhoneMatches = $nameFullPhoneMatches->filter(function($match) use ($transactionPhones) {
                    $memberPhone = $this->parser->normalizePhone($match['member']->phone ?? null);
                    return $memberPhone && in_array($memberPhone, $transactionPhones);
                });
                
                if ($exactFullPhoneMatches->count() === 1) {
                    $best = $exactFullPhoneMatches->first();
                    return [
                        'member_id' => $best['member']->id,
                        'status' => 'auto_assigned',
                        'confidence' => 1.0,
                        'reason' => 'Unique full phone match',
                    ];
                }

                // CRITICAL: Full phone match ALWAYS takes priority, even if others have last 3 digits match
                // All name + full phone matches = 100% confidence and auto-assign
                
                $bestFullMatch = $nameFullPhoneMatches->sortByDesc(function ($match) {
                    return $match['match_score'];
                })->values();

                if ($bestFullMatch->isNotEmpty()) {
                    $top = $bestFullMatch->first();
                    $ties = $bestFullMatch->filter(function ($match) use ($top) {
                        return abs($match['match_score'] - $top['match_score']) < 0.0001;
                    });

                    if ($ties->count() === 1) {
                        return [
                            'member_id' => $top['member']->id,
                            'status' => 'auto_assigned',
                            'confidence' => 1.0,
                            'reason' => 'Name + full phone match (highest score)',
                        ];
                    }

                    return [
                        'member_id' => $top['member']->id,
                        'status' => 'draft',
                        'confidence' => 1.0,
                        'reason' => 'Multiple full phone matches',
                        'draft_member_ids' => $ties->map(function ($m) {
                            return $m['member']->id;
                        })->toArray(),
                    ];
                }
            }
            
            // Check for last 3 digits + name match (also 100%)
            // CRITICAL: Only auto-assign if name matches (2+ words preferred, but 1+ is OK)
            // CRITICAL: For M-Pesa Paybill, filter out matches where member's name doesn't appear in particulars
            $last3Matches = collect($namePhoneMatches)->filter(function($match) use ($isMpesaPaybill, $transaction) {
                if ($match['phone_match_type'] !== 'last3' || $match['name_match_count'] < 1) {
                    return false;
                }
                
                // For M-Pesa Paybill, verify member's name actually appears in particulars
                if ($isMpesaPaybill) {
                    $particulars = strtolower($transaction->particulars);
                    $memberNameWords = array_filter(explode(' ', strtolower($match['member']->name)), function($w) { return strlen($w) > 2; });
                    $memberNameInParticulars = false;
                    
                    foreach ($memberNameWords as $memWord) {
                        if (strpos($particulars, $memWord) !== false) {
                            $memberNameInParticulars = true;
                            break;
                        }
                    }
                    
                    // If member's name doesn't appear in particulars, exclude from matches
                    if (!$memberNameInParticulars) {
                        return false; // Don't include this match
                    }
                }
                
                return true;
            });
            
            if ($last3Matches->isNotEmpty()) {
                // If 2+ name words match + last 3 digits, always auto-assign (even if multiple)
                $strongMatches = $last3Matches->filter(function($match) {
                    return $match['name_match_count'] >= 2;
                });
                
                if ($strongMatches->isNotEmpty() && count($strongMatches) === 1) {
                    return [
                        'member_id' => $strongMatches->first()['member']->id,
                        'status' => 'auto_assigned',
                        'confidence' => 1.0,
                        'reason' => '2+ names + last 3 digits match (100%)',
                    ];
                }
                
                // If only one match with 1+ name words + last 3 digits, auto-assign
                if (count($last3Matches) === 1) {
                    return [
                        'member_id' => $last3Matches->first()['member']->id,
                        'status' => 'auto_assigned',
                        'confidence' => 1.0,
                        'reason' => 'Name + last 3 digits match (100%)',
                    ];
                }
            }
            
            // CRITICAL: If 2+ names match (even without phone), auto-assign if unique
            $nameOnlyMatches = collect($namePhoneMatches)->filter(function($match) {
                return $match['name_match_count'] >= 2 && !$match['phone_match_type'];
            });
            
            if ($nameOnlyMatches->isNotEmpty() && count($nameOnlyMatches) === 1) {
                return [
                    'member_id' => $nameOnlyMatches->first()['member']->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => '2+ names match (unique, 100%)',
                ];
            }
            
            // If we have only one match, auto-assign with 100% confidence
            if (count($namePhoneMatches) === 1) {
                $match = $namePhoneMatches[0];
                return [
                    'member_id' => $match['member']->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => 'Name + phone match (' . $match['phone_match_type'] . ', 100%)',
                ];
            } elseif (count($namePhoneMatches) > 1) {
                // If one has exact name match, prefer it
                $exactMatch = collect($namePhoneMatches)->firstWhere('exact_name_match', true);
                if ($exactMatch) {
                    return [
                        'member_id' => $exactMatch['member']->id,
                        'status' => 'auto_assigned',
                        'confidence' => 1.0,
                        'reason' => 'Exact name + phone match (' . $exactMatch['phone_match_type'] . ')',
                    ];
                }
                
                // Check if one has better name match (2+ words) than others
                $bestNameMatch = collect($namePhoneMatches)->sortByDesc(function($match) {
                    // Prioritize by: exact match > name count > phone match type
                    $score = 0;
                    if ($match['exact_name_match']) {
                        $score += 1000;
                    }
                    $score += $match['name_match_count'] * 100;
                    if ($match['phone_match_type'] === 'full' || $match['phone_match_type'] === 'masked_full') {
                        $score += 50;
                    } elseif ($match['phone_match_type'] === 'last3') {
                        $score += 25;
                    }
                    return $score;
                })->first();
                
                $sameLevelMatches = collect($namePhoneMatches)->filter(function($match) use ($bestNameMatch) {
                    return $match['name_match_count'] === $bestNameMatch['name_match_count'] &&
                           $match['member']->id !== $bestNameMatch['member']->id &&
                           $match['exact_name_match'] === $bestNameMatch['exact_name_match'];
                });
                
                // CRITICAL: If best match has 2+ name words and is unique at that level, auto-assign
                // OR if best match has significantly more name matches, auto-assign
                if ($bestNameMatch['name_match_count'] >= 2) {
                    // If unique at this level, auto-assign
                    if ($sameLevelMatches->isEmpty()) {
                        return [
                            'member_id' => $bestNameMatch['member']->id,
                            'status' => 'auto_assigned',
                            'confidence' => 1.0,
                            'reason' => '2+ names match (best match, 100%)',
                        ];
                    }
                    // If best match has significantly more matches (at least 1 more), auto-assign
                    $nextBest = collect($namePhoneMatches)->sortByDesc(function($match) {
                        return $match['name_match_count'];
                    })->skip(1)->first();
                    
                    if ($nextBest && $bestNameMatch['name_match_count'] > $nextBest['name_match_count']) {
                        return [
                            'member_id' => $bestNameMatch['member']->id,
                            'status' => 'auto_assigned',
                            'confidence' => 1.0,
                            'reason' => 'Best name match (' . $bestNameMatch['name_match_count'] . ' names, 100%)',
                        ];
                    }
                }
                
                // CRITICAL: For M-Pesa Paybill, filter out members whose names don't appear in particulars
                // Only include members whose names actually appear in the transaction description
                $filteredMatches = collect($namePhoneMatches);
                if ($isMpesaPaybill) {
                    $particulars = strtolower($transaction->particulars);
                    $filteredMatches = $filteredMatches->filter(function($match) use ($particulars) {
                        $memberNameWords = array_filter(explode(' ', strtolower($match['member']->name)), function($w) { return strlen($w) > 2; });
                        foreach ($memberNameWords as $memWord) {
                            if (strpos($particulars, $memWord) !== false) {
                                return true; // At least one name word appears in particulars
                            }
                        }
                        return false; // Member's name doesn't appear in particulars - exclude
                    });
                }
                
                // If after filtering we have only one match, auto-assign it
                if ($filteredMatches->count() === 1) {
                    return [
                        'member_id' => $filteredMatches->first()['member']->id,
                        'status' => 'auto_assigned',
                        'confidence' => 1.0,
                        'reason' => 'Name + phone match (verified in particulars, 100%)',
                    ];
                }
                
                // Multiple matches = draft (only if truly ambiguous)
                // Only include filtered matches (members whose names appear in particulars)
                return [
                    'member_id' => $filteredMatches->isNotEmpty() ? $filteredMatches->first()['member']->id : $namePhoneMatches[0]['member']->id,
                    'status' => 'draft',
                    'confidence' => 0.9,
                    'reason' => 'Multiple name + phone matches',
                    'draft_member_ids' => $filteredMatches->isNotEmpty() ? $filteredMatches->pluck('member.id')->toArray() : collect($namePhoneMatches)->pluck('member.id')->toArray(),
                ];
            }
        }

        // Strategy 2: Multiple Name Words Match (2+ names) - 100% auto-assign if unique
        // CRITICAL: For ALL transactions (including drafts), auto-assign when 2+ names match (order-independent)
        if (!empty($parsed['member_name'])) {
            // Apply Strategy 2 for ALL transaction types (not just bank transactions)
            // This ensures draft transactions with 2+ name matches get auto-assigned
            $nameMatches = [];
            
            foreach ($members as $member) {
                // Count matching name words with fuzzy matching (order-independent)
                $txName = preg_replace('/\s+/', ' ', strtolower(trim($parsed['member_name'])));
                $memName = preg_replace('/\s+/', ' ', strtolower(trim($member->name)));
                
                $nameWords = array_filter(explode(' ', $txName), function($w) { return strlen($w) > 2; });
                $memberNameWords = array_filter(explode(' ', $memName), function($w) { return strlen($w) > 2; });
                
                // Exact word matches (order-independent)
                $matchingWords = array_intersect($nameWords, $memberNameWords);
                $exactMatchCount = count($matchingWords);
                
                // Fuzzy word matching
                $fuzzyMatches = 0;
                $matchedTxWords = [];
                $matchedMemWords = [];
                
                foreach ($nameWords as $txWord) {
                    if (in_array($txWord, $matchingWords)) {
                        continue; // Already counted
                    }
                    
                    foreach ($memberNameWords as $memWord) {
                        if (in_array($memWord, $matchingWords) || 
                            in_array($txWord, $matchedTxWords) || 
                            in_array($memWord, $matchedMemWords)) {
                            continue;
                        }
                        
                        similar_text($txWord, $memWord, $percent);
                        if ($percent >= 85) {
                            $fuzzyMatches++;
                            $matchedTxWords[] = $txWord;
                            $matchedMemWords[] = $memWord;
                            break;
                        }
                    }
                }
                
                $totalMatchCount = $exactMatchCount + $fuzzyMatches;
                
                // Need at least 2 matching words (exact or fuzzy) for ALL transactions
                if ($totalMatchCount >= 2) {
                    $nameMatches[] = [
                        'member' => $member,
                        'match_count' => $totalMatchCount,
                    ];
                }
            }
            
            // If 2+ names match and only one member has those names = 100% auto-assign
            if (count($nameMatches) === 1) {
                return [
                    'member_id' => $nameMatches[0]['member']->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => $nameMatches[0]['match_count'] . ' name words match (unique)',
                ];
            } elseif (count($nameMatches) > 1) {
                // Multiple members with same names = draft
                return [
                    'member_id' => $nameMatches[0]['member']->id,
                    'status' => 'draft',
                    'confidence' => 0.9,
                    'reason' => 'Multiple members with 2+ matching names',
                    'draft_member_ids' => collect($nameMatches)->pluck('member.id')->toArray(),
                ];
            }
        }

        // Strategy 3: Single Name Match - 100% auto-assign if unique
        if (!empty($parsed['member_name'])) {
            $nameMatches = [];
            
            foreach ($members as $member) {
                // Check if at least one name word matches (exact or fuzzy)
                $txName = preg_replace('/\s+/', ' ', strtolower(trim($parsed['member_name'])));
                $memName = preg_replace('/\s+/', ' ', strtolower(trim($member->name)));
                
                $nameWords = array_filter(explode(' ', $txName), function($w) { return strlen($w) > 2; });
                $memberNameWords = array_filter(explode(' ', $memName), function($w) { return strlen($w) > 2; });
                
                // Exact word matches
                $matchingWords = array_intersect($nameWords, $memberNameWords);
                $hasMatch = count($matchingWords) >= 1;
                
                // Fuzzy word matching if no exact match
                if (!$hasMatch) {
                    foreach ($nameWords as $txWord) {
                        foreach ($memberNameWords as $memWord) {
                            similar_text($txWord, $memWord, $percent);
                            if ($percent >= 85) {
                                $hasMatch = true;
                                break 2;
                            }
                        }
                    }
                }
                
                if ($hasMatch) {
                    $nameMatches[] = $member;
                }
            }
            
            // If only one name matches and no other member has that name = 100% auto-assign
            if (count($nameMatches) === 1) {
                return [
                    'member_id' => $nameMatches[0]->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => 'Unique name match (100%)',
                ];
            } elseif (count($nameMatches) > 1) {
                // Multiple members with same name = draft
                return [
                    'member_id' => $nameMatches[0]->id,
                    'status' => 'draft',
                    'confidence' => 0.7,
                    'reason' => 'Multiple members with matching name',
                    'draft_member_ids' => collect($nameMatches)->pluck('id')->toArray(),
                ];
            }
        }

        // Strategy 4: Phone Match (100% auto-assign if unique) - EVEN if name was found but didn't match
        // CRITICAL: If phone matches 100% (full or masked), it should auto-assign, not draft
        // This applies even if names are not similar - phone number is definitive
        // EXCEPTION: For M-Pesa Paybill with last 3 digits, member's name MUST appear in particulars
        $isMpesaPaybill = $parsed['transaction_type'] === 'M-Pesa Paybill';
        
        if (!empty($parsed['phones']) || !empty($parsed['last_3_phone_digits'])) {
            $phoneMatches = [];
            $fullPhoneMatches = []; // Track 100% matches separately
            
            foreach ($parsed['phones'] ?? [] as $phone) {
                // Handle masked phone formats (100% match)
                if (preg_match('/^masked_(2547|07)_(\d+)$/', $phone, $maskedParts)) {
                    $suffix = $maskedParts[2];
                    $prefix = $maskedParts[1];
                    
                    foreach ($members as $member) {
                        if (!$member->phone) continue;
                        
                        $memberPhone = $this->parser->normalizePhone($member->phone);
                        if (!$memberPhone) continue;
                        
                        // Check if suffix matches and prefix matches
                        if (strlen($memberPhone) >= strlen($suffix)) {
                            $memberSuffix = substr($memberPhone, -strlen($suffix));
                            if ($memberSuffix === $suffix) {
                                // Check prefix match
                                if ($prefix === '2547' && substr($memberPhone, 0, 4) === '2547') {
                                    $fullPhoneMatches[] = $member;
                                } elseif ($prefix === '07' && (substr($memberPhone, 0, 4) === '2547' || substr($memberPhone, 0, 2) === '07')) {
                                    $fullPhoneMatches[] = $member;
                                }
                            }
                        }
                    }
                    continue;
                }
                
                // Regular full phone match (100% match)
                $normalizedPhone = $this->parser->normalizePhone($phone);
                if (!$normalizedPhone) continue;

                foreach ($members as $member) {
                    if (!$member->phone) continue;
                    
                    $memberPhone = $this->parser->normalizePhone($member->phone);
                    if (!$memberPhone) continue;

                    // Full phone match = 100% match
                    if ($normalizedPhone === $memberPhone) {
                        if (!in_array($member->id, collect($fullPhoneMatches)->pluck('id')->toArray())) {
                            $fullPhoneMatches[] = $member;
                        }
                    }
                    // Partial match (last 4-6 digits) = draft
                    elseif (strlen($normalizedPhone) >= 4 && strlen($memberPhone) >= 4) {
                        $txLast4 = substr($normalizedPhone, -4);
                        $memLast4 = substr($memberPhone, -4);
                        if ($txLast4 === $memLast4 && !in_array($member->id, collect($phoneMatches)->pluck('id')->toArray())) {
                            $phoneMatches[] = $member;
                        }
                    }
                }
            }
            
            // Check last 3 digits if available
            // CRITICAL: For M-Pesa Paybill, member's name MUST appear in particulars
            // If last 3 digits match but name is NOT in description, do NOT suggest in drafts
            if (!empty($parsed['last_3_phone_digits'])) {
                $particulars = strtolower($transaction->particulars);
                
                foreach ($members as $member) {
                    if (!$member->phone) continue;
                    $memberPhone = $this->parser->normalizePhone($member->phone);
                    if ($memberPhone && strlen($memberPhone) >= 3) {
                        $memberLast3 = substr($memberPhone, -3);
                        if ($parsed['last_3_phone_digits'] === $memberLast3) {
                            // CRITICAL: For M-Pesa Paybill, verify member's name appears in particulars
                            $memberNameWords = array_filter(explode(' ', strtolower($member->name)), function($w) { return strlen($w) > 2; });

                            $matchedWords = 0;
                            foreach ($memberNameWords as $memWord) {
                                if (strpos($particulars, $memWord) !== false) {
                                    $matchedWords++;
                                }
                            }

                            if ($isMpesaPaybill) {
                                // Require at least two meaningful words to appear in the particulars.
                                if ($matchedWords < 2) {
                                    continue;
                                }
                            } elseif ($matchedWords === 0) {
                                continue;
                            }
                            
                            // Last 3 digits match = 100% match (and name verified for M-Pesa Paybill)
                            if (!in_array($member->id, collect($fullPhoneMatches)->pluck('id')->toArray())) {
                                $fullPhoneMatches[] = $member;
                            }
                        }
                    }
                }
            }

            // If we have 100% phone matches (full or masked), auto-assign if unique
            if (count($fullPhoneMatches) === 1) {
                return [
                    'member_id' => $fullPhoneMatches[0]->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => 'Full phone match (no name, 100%)',
                ];
            } elseif (count($fullPhoneMatches) > 1) {
                Log::debug('Multiple full phone matches detected', [
                    'transaction_id' => $transaction->id,
                    'member_ids' => collect($fullPhoneMatches)->pluck('id')->toArray(),
                    'member_names' => collect($fullPhoneMatches)->map(fn($m) => $m->name)->toArray(),
                ]);

                // Try to break the tie using name evidence from the particulars.
                $particularWords = preg_split('/\s+/', strtolower($transaction->particulars));
                $candidateScores = collect($fullPhoneMatches)->map(function ($member) use ($particularWords, $normalizedParticulars) {
                    $nameWords = array_filter(explode(' ', strtolower($member->name)), function ($word) {
                        return strlen($word) > 2;
                    });

                    $hits = 0;
                    foreach ($nameWords as $word) {
                        if (str_contains($normalizedParticulars, $word)) {
                            $hits++;
                            continue;
                        }

                        foreach ($particularWords as $txWord) {
                            if ($this->wordsLooselyMatch($txWord, $word)) {
                                $hits++;
                                break;
                            }
                        }
                    }

                    return [
                        'member' => $member,
                        'hits' => $hits,
                    ];
                })->sortByDesc('hits')->values();

                if ($candidateScores->isNotEmpty()) {
                    $best = $candidateScores->first();
                    $runnerUp = $candidateScores->get(1);

                    if ($best['hits'] > 0 && (!$runnerUp || $best['hits'] > $runnerUp['hits'])) {
                        Log::debug('Resolving full phone tie via name evidence', [
                            'transaction_id' => $transaction->id,
                            'selected_member_id' => $best['member']->id,
                            'selected_member_name' => $best['member']->name,
                            'hits' => $best['hits'],
                            'runner_up_hits' => $runnerUp['hits'] ?? null,
                        ]);

                        return [
                            'member_id' => $best['member']->id,
                            'status' => 'auto_assigned',
                            'confidence' => 1.0,
                            'reason' => 'Full phone match + strongest name evidence',
                        ];
                    }
                }

                // Multiple 100% matches = draft
                return [
                    'member_id' => $fullPhoneMatches[0]->id,
                    'status' => 'draft',
                    'confidence' => 1.0,
                    'reason' => 'Multiple full phone matches',
                    'draft_member_ids' => collect($fullPhoneMatches)->pluck('id')->toArray(),
                ];
            }
            
            // REMOVED: No longer checking last 3 digits alone (without name)
            // Only check last 3 digits when name is also present (handled in Strategy 1 above)
            
            // Only partial matches = draft
            if (count($phoneMatches) > 0) {
                return [
                    'member_id' => $phoneMatches[0]->id,
                    'status' => 'draft',
                    'confidence' => 0.6,
                    'reason' => 'Partial phone match (no name)',
                    'draft_member_ids' => collect($phoneMatches)->pluck('id')->toArray(),
                ];
            }
        }
        
        // Strategy 4b: M-Pesa Partial Phone + Name Match (but name not in description)
        // This should NOT happen - if name is in description, Strategy 1 should have caught it
        // But if somehow we have last_3_phone_digits and member_name, ensure name is actually in the transaction particulars
        if (!empty($parsed['last_3_phone_digits']) && !empty($parsed['member_name'])) {
            // This case should have been handled by Strategy 1
            // If we reach here, it means Strategy 1 didn't find a match
            // So we should NOT create a draft match based on phone alone
            // Return null to continue to next strategy
        }

        // Strategy 5: Member Number Match
        if (!empty($parsed['member_number'])) {
            $memberNumberMatches = $members->filter(function ($member) use ($parsed) {
                return $member->member_number === $parsed['member_number'] ||
                       $member->member_code === $parsed['member_number'];
            });

            if ($memberNumberMatches->count() === 1) {
                return [
                    'member_id' => $memberNumberMatches->first()->id,
                    'status' => 'auto_assigned',
                    'confidence' => 1.0,
                    'reason' => 'Member number match',
                ];
            }
        }

        Log::debug('Auto-match heuristics exhausted', [
            'transaction_id' => $transaction->id,
            'transaction_type' => $parsed['transaction_type'] ?? null,
            'has_member_name' => !empty($parsed['member_name']),
            'has_phones' => !empty($parsed['phones']),
            'phones' => $parsed['phones'] ?? [],
            'last_3_digits' => $parsed['last_3_phone_digits'] ?? null,
            'particulars' => $transaction->particulars,
        ]);

        return null;
    }

    protected function phoneAppearsInText(string $digitsOnlyParticulars, string $normalizedPhone): bool
    {
        $digitsOnlyPhone = preg_replace('/\D+/', '', $normalizedPhone);
        if (!$digitsOnlyPhone) {
            return false;
        }

        if (str_contains($digitsOnlyParticulars, $digitsOnlyPhone)) {
            return true;
        }

        if (strlen($digitsOnlyPhone) > 3) {
            $local = substr($digitsOnlyPhone, 3);
            if ($local && str_contains($digitsOnlyParticulars, $local)) {
                return true;
            }
            $localWithZero = '0' . $local;
            if ($local && str_contains($digitsOnlyParticulars, $localWithZero)) {
                return true;
            }
        }

        return false;
    }

    protected function wordsLooselyMatch(string $txWord, string $memWord): bool
    {
        $txWord = strtolower($txWord);
        $memWord = strtolower($memWord);

        if (strlen($txWord) < 3 || strlen($memWord) < 3) {
            return false;
        }

        if (str_starts_with($txWord, $memWord) || str_starts_with($memWord, $txWord)) {
            $shorter = min(strlen($txWord), strlen($memWord));
            $longer = max(strlen($txWord), strlen($memWord));

            return $shorter / ($longer ?: 1) >= 0.6;
        }

        return levenshtein($txWord, $memWord) <= 1;
    }

    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:members,id',
            'transactions' => 'required_without:transaction_ids|array',
            'transactions.*' => 'integer|exists:transactions,id',
            'transaction_ids' => 'required_without:transactions|array',
            'transaction_ids.*' => 'integer|exists:transactions,id',
        ]);

        $transactionIds = $validated['transactions'] ?? $validated['transaction_ids'] ?? [];
        if (empty($transactionIds)) {
            return response()->json([
                'success' => 0,
                'errors' => ['No transactions supplied for bulk assignment'],
            ], 422);
        }

        $success = 0;
        $errors = [];

        DB::transaction(function () use ($transactionIds, $request, &$success, &$errors) {
            foreach ($transactionIds as $transactionId) {
                try {
                    $transaction = Transaction::findOrFail($transactionId);

                    if ($transaction->is_archived) {
                        $errors[] = "Transaction {$transactionId}: Archived transactions cannot be assigned";
                        continue;
                    }

                    $oldMemberId = $transaction->member_id;
                    $newMemberId = $request->member_id;
                    $transactionAmount = (float) ($transaction->credit > 0 ? $transaction->credit : $transaction->debit);

                    // If reassigning to a different member, handle as transfer
                    if ($oldMemberId && $oldMemberId != $newMemberId) {
                        // Delete existing splits and transfers first
                        $transaction->splits()->delete();
                        $transaction->transfers()->delete();

                        // Create transfer record
                        TransactionTransfer::create([
                            'transaction_id' => $transaction->id,
                            'from_member_id' => $oldMemberId,
                            'initiated_by' => optional($request->user())->id,
                            'mode' => 'single',
                            'total_amount' => $transactionAmount,
                            'notes' => 'Bulk reassignment',
                            'metadata' => [
                                'previous_member_id' => $oldMemberId,
                                'new_member_id' => $newMemberId,
                                'previous_assignment_status' => $transaction->assignment_status,
                            ],
                        ]);

                        // Create match log for new assignment
                        TransactionMatchLog::create([
                            'transaction_id' => $transaction->id,
                            'member_id' => $newMemberId,
                            'confidence' => 1.0,
                            'match_reason' => "Bulk reassigned from member {$oldMemberId} to member {$newMemberId}",
                            'source' => 'manual',
                            'user_id' => $request->user()->id,
                        ]);
                    } else {
                        // New assignment or same member - just create match log
                        TransactionMatchLog::create([
                            'transaction_id' => $transaction->id,
                            'member_id' => $newMemberId,
                            'confidence' => 1.0,
                            'match_reason' => 'Bulk manual assignment',
                            'source' => 'manual',
                            'user_id' => $request->user()->id,
                        ]);
                    }

                    // Update transaction
                    $transaction->update([
                        'member_id' => $newMemberId,
                        'assignment_status' => 'manual_assigned',
                        'match_confidence' => 1.0,
                        'draft_member_ids' => null,
                    ]);

                    $success++;
                } catch (\Exception $e) {
                    $errors[] = "Transaction {$transactionId}: " . $e->getMessage();
                }
            }
        });

        return response()->json([
            'success' => $success,
            'failed' => count($errors),
            'errors' => $errors,
        ]);
    }

    protected function archiveTransactionModel(Transaction $transaction, ?string $reason = null): bool
    {
        if ($transaction->is_archived) {
            return false;
        }

        $updates = [
            'is_archived' => true,
            'archived_at' => now(),
            'archive_reason' => $reason,
        ];

        // If transaction is assigned, unassign it when archiving
        if (
            $transaction->member_id ||
            $transaction->assignment_status !== 'unassigned' ||
            !empty($transaction->draft_member_ids)
        ) {
            // Delete any splits associated with this transaction
            $transaction->splits()->delete();
            $updates = array_merge($updates, [
                'member_id' => null,
                'assignment_status' => 'unassigned',
                'match_confidence' => null,
                'draft_member_ids' => null,
            ]);
        }

        // Update the transaction
        $result = $transaction->update($updates);
        
        // Refresh the model to ensure we have the latest data
        $transaction->refresh();

        return $result;
    }

    public function archive(Request $request, Transaction $transaction)
    {
        try {
            Log::info('Archive request received', [
                'transaction_id' => $transaction->id,
                'current_is_archived' => $transaction->is_archived,
                'reason' => $request->input('reason'),
            ]);

            $request->validate([
                'reason' => 'nullable|string|max:500',
            ]);

            if (!$this->archiveTransactionModel($transaction, $request->input('reason'))) {
                Log::warning('Transaction already archived', ['transaction_id' => $transaction->id]);
                return response()->json([
                    'message' => 'Transaction already archived',
                    'transaction' => $transaction->fresh(['member', 'bankStatement']),
                ], 200);
            }

            Log::info('Transaction archived successfully', ['transaction_id' => $transaction->id]);
            return response()->json([
                'message' => 'Transaction archived successfully',
                'transaction' => $transaction->fresh(['member', 'bankStatement']),
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Archive validation error', [
                'transaction_id' => $transaction->id,
                'errors' => $e->errors(),
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Archive transaction error: ' . $e->getMessage(), [
                'transaction_id' => $transaction->id,
                'error' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Failed to archive transaction: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function unarchive(Transaction $transaction)
    {
        try {
            if (!$transaction->is_archived) {
                return response()->json([
                    'message' => 'Transaction is not archived',
                    'transaction' => $transaction,
                ]);
            }

            $transaction->update([
                'is_archived' => false,
                'archived_at' => null,
                'archive_reason' => null,
            ]);

            Log::info('Transaction restored successfully', ['transaction_id' => $transaction->id]);
            return response()->json([
                'message' => 'Transaction restored successfully',
                'transaction' => $transaction->fresh(['member', 'bankStatement']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Restore transaction error: ' . $e->getMessage(), [
                'transaction_id' => $transaction->id,
                'error' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Failed to restore transaction: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function bulkArchive(Request $request)
    {
        $validated = $request->validate([
            'transaction_ids' => 'required|array|min:1',
            'transaction_ids.*' => 'exists:transactions,id',
            'reason' => 'nullable|string|max:500',
        ]);

        $transactions = Transaction::whereIn('id', $validated['transaction_ids'])->get();

        $archived = 0;
        foreach ($transactions as $transaction) {
            if ($this->archiveTransactionModel($transaction, $validated['reason'] ?? null)) {
                $archived++;
            }
        }

        return response()->json([
            'message' => "Archived {$archived} transaction(s)",
            'archived' => $archived,
            'requested' => count($validated['transaction_ids']),
        ]);
    }

    public function askAi(Request $request, Transaction $transaction, MatchingService $matchingService)
    {
        $members = Member::where('is_active', true)->get();
        
        $transactionData = [
            'id' => $transaction->id,
            'tran_date' => $transaction->tran_date,
            'particulars' => $transaction->particulars,
            'credit' => $transaction->credit,
            'transaction_code' => $transaction->transaction_code,
            'phones' => $transaction->phones,
        ];

        $membersData = $members->map(function ($member) {
            return [
                'id' => $member->id,
                'name' => $member->name,
                'phone' => $member->phone,
                'member_code' => $member->member_code,
                'member_number' => $member->member_number,
            ];
        })->toArray();

        $matches = $matchingService->matchBatch([$transactionData], $membersData);

        return response()->json([
            'transaction' => $transaction,
            'suggestions' => $matches[0] ?? [],
        ]);
    }

    public function transfer(Request $request, Transaction $transaction)
    {
        if ($transaction->is_archived) {
            return response()->json([
                'message' => 'Cannot transfer an archived transaction',
            ], 422);
        }

        // Support both single transfer and multiple recipients (split)
        $request->validate([
            'to_member_id' => 'required_without:recipients|exists:members,id',
            'recipients' => 'required_without:to_member_id|array|min:1',
            'recipients.*.member_id' => 'required|exists:members,id',
            'recipients.*.amount' => 'required|numeric|min:0.01',
            'recipients.*.notes' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:500',
        ]);

        $transactionAmount = (float) ($transaction->credit > 0 ? $transaction->credit : $transaction->debit);
        $fromMemberId = $transaction->member_id;
        $previousStatus = $transaction->assignment_status;

        // If multiple recipients provided, use split logic
        if ($request->has('recipients') && is_array($request->recipients) && count($request->recipients) > 0) {
            $totalAmount = collect($request->recipients)->sum('amount');

            if (abs($totalAmount - $transactionAmount) > 0.01) {
                return response()->json([
                    'message' => 'Recipient amounts must sum to transaction amount',
                    'expected' => $transactionAmount,
                    'provided' => $totalAmount,
                ], 422);
            }

            return $this->handleMultiRecipientTransfer($transaction, $request, $fromMemberId, $previousStatus, $transactionAmount);
        }

        // Single recipient transfer or assignment
        if (!$fromMemberId) {
            // Unassigned transaction - treat as initial assignment
            $toMember = Member::findOrFail($request->to_member_id);

            DB::transaction(function () use ($transaction, $request, $toMember, $transactionAmount, $previousStatus) {
                $transaction->splits()->delete();
                $transaction->transfers()->delete();

                $transaction->update([
                    'member_id' => $request->to_member_id,
                    'assignment_status' => 'manual_assigned',
                    'match_confidence' => 1.0,
                    'draft_member_ids' => null,
                ]);

                TransactionMatchLog::create([
                    'transaction_id' => $transaction->id,
                    'member_id' => $request->to_member_id,
                    'confidence' => 1.0,
                    'match_reason' => 'Manual assignment via transfer' . ($request->notes ? ": {$request->notes}" : ''),
                    'source' => 'manual',
                    'user_id' => $request->user()->id,
                ]);
            });

            $transaction->load(['member', 'bankStatement', 'splits.member']);

            return response()->json([
                'message' => 'Transaction assigned successfully',
                'transaction' => $transaction,
            ]);
        }

        if ($fromMemberId == $request->to_member_id) {
            return response()->json([
                'message' => 'Cannot transfer to the same member',
            ], 422);
        }

        $fromMember = Member::findOrFail($fromMemberId);
        $toMember = Member::findOrFail($request->to_member_id);

        DB::transaction(function () use ($transaction, $request, $fromMember, $toMember, $transactionAmount, $previousStatus) {
            $transaction->splits()->delete();
            $transaction->transfers()->delete();

            $transaction->update([
                'member_id' => $request->to_member_id,
                'assignment_status' => 'transferred',
                'draft_member_ids' => null,
            ]);

            TransactionTransfer::create([
                'transaction_id' => $transaction->id,
                'from_member_id' => $fromMember->id,
                'initiated_by' => optional($request->user())->id,
                'mode' => 'single',
                'total_amount' => $transactionAmount,
                'notes' => $request->input('notes'),
                'metadata' => [
                    'previous_member_id' => $fromMember->id,
                    'new_member_id' => $toMember->id,
                    'previous_assignment_status' => $previousStatus,
                ],
            ]);

            TransactionMatchLog::create([
                'transaction_id' => $transaction->id,
                'member_id' => $request->to_member_id,
                'confidence' => 1.0,
                'match_reason' => "Transferred from {$fromMember->name} to {$toMember->name}" . ($request->notes ? ": {$request->notes}" : ''),
                'source' => 'manual',
                'user_id' => $request->user()->id,
            ]);
        });

        $transaction->load(['member', 'bankStatement', 'splits.member']);

        return response()->json([
            'message' => 'Transaction transferred successfully',
            'transaction' => $transaction,
        ]);
    }

    protected function handleMultiRecipientTransfer(Transaction $transaction, Request $request, $fromMemberId, $previousStatus, $transactionAmount)
    {
        return DB::transaction(function () use ($transaction, $request, $fromMemberId, $previousStatus, $transactionAmount) {
            $transaction->splits()->delete();
            $transaction->transfers()->delete();

            $fromMember = $fromMemberId ? Member::find($fromMemberId) : null;
            $fromMemberName = $fromMember ? $fromMember->name : 'Unassigned';

            $transfer = TransactionTransfer::create([
                'transaction_id' => $transaction->id,
                'from_member_id' => $fromMemberId,
                'initiated_by' => optional($request->user())->id,
                'mode' => 'split',
                'total_amount' => $transactionAmount,
                'notes' => $request->input('notes'),
                'metadata' => [
                    'previous_member_id' => $fromMemberId,
                    'previous_assignment_status' => $previousStatus,
                    'entries' => collect($request->recipients)->map(function ($recipient) {
                        return [
                            'member_id' => $recipient['member_id'],
                            'amount' => $recipient['amount'],
                            'notes' => $recipient['notes'] ?? null,
                        ];
                    })->toArray(),
                ],
            ]);

            foreach ($request->recipients as $recipient) {
                TransactionSplit::create([
                    'transaction_id' => $transaction->id,
                    'member_id' => $recipient['member_id'],
                    'amount' => $recipient['amount'],
                    'notes' => $recipient['notes'] ?? null,
                    'transfer_id' => $transfer->id,
                ]);

                TransactionMatchLog::create([
                    'transaction_id' => $transaction->id,
                    'member_id' => $recipient['member_id'],
                    'confidence' => 1.0,
                    'match_reason' => "Transferred from {$fromMemberName} (split)" . ($request->notes ? ": {$request->notes}" : ''),
                    'source' => 'manual',
                    'user_id' => $request->user()->id,
                ]);
            }

            // If only one recipient, assign to that member; otherwise keep unassigned but mark as transferred
            $recipientIds = collect($request->recipients)->pluck('member_id')->unique();
            $newMemberId = $recipientIds->count() === 1 ? $recipientIds->first() : null;

            $transaction->update([
                'member_id' => $newMemberId,
                'assignment_status' => 'transferred',
                'draft_member_ids' => null,
            ]);

            $transaction->load(['member', 'bankStatement', 'splits.member']);

            return response()->json([
                'message' => 'Transaction transferred to multiple recipients successfully',
                'transaction' => $transaction,
            ]);
        });
    }
}

