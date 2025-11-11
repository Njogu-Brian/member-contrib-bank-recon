<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionMatchLog;
use App\Models\Member;
use App\Services\MatchingService;
use App\Services\TransactionParserService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        protected MatchingService $matchingService,
        protected TransactionParserService $parserService
    ) {}

    public function index(Request $request)
    {
        $query = Transaction::with(['member', 'bankStatement', 'splits.member']);

        // Only apply status filter if status is explicitly provided and not empty
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

        $perPage = $request->get('per_page', 20);
        $transactions = $query->orderBy('tran_date', 'desc')
            ->paginate($perPage);

        return response()->json($transactions);
    }

    public function show(Transaction $transaction)
    {
        $transaction->load(['member', 'bankStatement', 'matchLogs.member', 'matchLogs.user', 'splits.member']);

        return response()->json($transaction);
    }

    public function assign(Request $request, Transaction $transaction)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id',
            'confidence' => 'nullable|numeric|min:0|max:1',
            'match_reason' => 'nullable|string',
        ]);

        $transaction->update([
            'member_id' => $request->member_id,
            'assignment_status' => 'manual_assigned',
            'match_confidence' => $request->confidence ?? 1.0,
        ]);

        TransactionMatchLog::create([
            'transaction_id' => $transaction->id,
            'member_id' => $request->member_id,
            'confidence' => $request->confidence ?? 1.0,
            'match_reason' => $request->match_reason ?? 'Manual assignment',
            'source' => 'manual',
            'user_id' => $request->user()->id,
        ]);

        return response()->json($transaction->load('member'));
    }

    public function askAi(Request $request)
    {
        $request->validate([
            'transaction_id' => 'required|exists:transactions,id',
        ]);

        $transaction = Transaction::findOrFail($request->transaction_id);
        $members = \App\Models\Member::where('is_active', true)->get();

        $matches = $this->matchingService->matchBatch([
            [
                'client_tran_id' => 't_'.$transaction->id,
                'tran_date' => $transaction->tran_date->format('Y-m-d'),
                'particulars' => $transaction->particulars,
                'credit' => $transaction->credit,
                'transaction_code' => $transaction->transaction_code,
                'phones' => $transaction->phones ?? [],
            ],
        ], $members->toArray());

        return response()->json([
            'transaction' => $transaction,
            'matches' => $matches,
        ]);
    }

    public function split(Request $request, Transaction $transaction)
    {
        $request->validate([
            'splits' => 'required|array|min:1',
            'splits.*.member_id' => 'required|exists:members,id',
            'splits.*.amount' => 'required|numeric|min:0.01',
            'splits.*.notes' => 'nullable|string',
        ]);

        $totalAmount = collect($request->splits)->sum('amount');
        
        if (abs($totalAmount - $transaction->credit) > 0.01) {
            return response()->json([
                'message' => 'Total split amount must equal transaction amount',
                'transaction_amount' => $transaction->credit,
                'split_total' => $totalAmount,
            ], 422);
        }

        // Remove existing splits
        $transaction->splits()->delete();

        // Create new splits
        $splits = [];
        foreach ($request->splits as $splitData) {
            $splits[] = $transaction->splits()->create([
                'member_id' => $splitData['member_id'],
                'amount' => $splitData['amount'],
                'notes' => $splitData['notes'] ?? null,
            ]);
        }

        // Update transaction status
        $transaction->update([
            'assignment_status' => 'manual_assigned',
        ]);

        return response()->json([
            'message' => 'Transaction split successfully',
            'transaction' => $transaction->load(['splits.member', 'member']),
            'splits' => $splits,
        ]);
    }

    public function autoAssign(Request $request)
    {
        // First, delete all debit transactions (credit = 0, debit > 0)
        $deletedCount = Transaction::where('credit', 0)
            ->where('debit', '>', 0)
            ->delete();
        
        $limit = (int) $request->get('limit', 500);

        // Get unassigned and draft transactions
        $transactions = Transaction::whereIn('assignment_status', ['unassigned', 'draft'])
            ->limit($limit)
            ->get();

        if ($transactions->isEmpty()) {
            return response()->json([
                'message' => 'No unassigned transactions found',
                'auto_assigned' => 0,
                'draft_assigned' => 0,
                'total' => 0,
            ]);
        }

        // Get all active members
        $members = Member::where('is_active', true)->get();

        if ($members->isEmpty()) {
            return response()->json([
                'message' => 'No active members found',
                'auto_assigned' => 0,
                'draft_assigned' => 0,
                'total' => $transactions->count(),
            ], 400);
        }

        $autoAssigned = 0;
        $draftAssigned = 0;
        $results = [];

        foreach ($transactions as $transaction) {
            // Parse transaction particulars
            $parsed = $this->parserService->parseParticulars($transaction->particulars);

            // Update transaction type and extracted data
            $updateData = [];
            if ($parsed['transaction_type'] && !$transaction->transaction_type) {
                $updateData['transaction_type'] = $parsed['transaction_type'];
            }
            
            // Only set transaction_code if it's NOT a phone number
            if ($parsed['transaction_code'] && !$transaction->transaction_code) {
                // Double-check it's not a phone number
                if (!preg_match('/^254\d{9}$/', $parsed['transaction_code'])) {
                    $updateData['transaction_code'] = $parsed['transaction_code'];
                }
            }
            
            if ($parsed['member_number']) {
                $updateData['extracted_member_number'] = $parsed['member_number'];
            }
            if (!empty($parsed['phone_numbers'])) {
                $updateData['phones'] = $parsed['phone_numbers'];
                // If we have phone numbers but no transaction code, ensure transaction_code is null
                // (don't let phone numbers be stored as transaction codes)
                if (empty($parsed['transaction_code']) || preg_match('/^254\d{9}$/', $parsed['transaction_code'])) {
                    $updateData['transaction_code'] = null;
                }
            }
            if (!empty($updateData)) {
                $transaction->update($updateData);
            }

            // Store member number if found
            if ($parsed['member_number']) {
                // Find member by member_number or member_code
                $memberWithNumber = Member::where('member_number', $parsed['member_number'])
                    ->orWhere('member_code', $parsed['member_number'])
                    ->first();
                
                if ($memberWithNumber && !$memberWithNumber->member_number) {
                    $memberWithNumber->update(['member_number' => $parsed['member_number']]);
                }
            }

            // Strategy 1: Phone number match - AUTO ASSIGN (HIGHEST PRIORITY)
            if (!empty($parsed['phone_numbers'])) {
                $phoneMatches = [];
                foreach ($parsed['phone_numbers'] as $txPhone) {
                    $normalizedTxPhone = $this->parserService->normalizePhone($txPhone);
                    foreach ($members as $member) {
                        if ($member->phone) {
                            $normalizedMemberPhone = $this->parserService->normalizePhone($member->phone);
                            // Exact match or last 9 digits match
                            if ($normalizedTxPhone === $normalizedMemberPhone ||
                                (strlen($normalizedTxPhone) >= 9 && strlen($normalizedMemberPhone) >= 9 &&
                                 substr($normalizedTxPhone, -9) === substr($normalizedMemberPhone, -9))) {
                                $phoneMatches[] = $member;
                                break;
                            }
                        }
                    }
                }

                if (count($phoneMatches) === 1) {
                    // Single phone match - auto assign immediately
                    $member = $phoneMatches[0];
                    $transaction->update([
                        'member_id' => $member->id,
                        'assignment_status' => 'auto_assigned',
                        'match_confidence' => 0.98,
                        'draft_member_ids' => null,
                    ]);

                    TransactionMatchLog::create([
                        'transaction_id' => $transaction->id,
                        'member_id' => $member->id,
                        'confidence' => 0.98,
                        'match_reason' => 'Phone number match (254XXXXXXXXX)',
                        'source' => 'auto',
                        'user_id' => $request->user()->id,
                    ]);

                    $autoAssigned++;
                    $results[] = ['transaction_id' => $transaction->id, 'action' => 'auto_assigned', 'member' => $member->name, 'reason' => 'Phone match'];
                    continue;
                } elseif (count($phoneMatches) > 1) {
                    // Multiple phone matches - draft assign
                    $draftMemberIds = array_map(fn($m) => $m->id, $phoneMatches);
                    $transaction->update([
                        'assignment_status' => 'draft',
                        'draft_member_ids' => $draftMemberIds,
                    ]);
                    $draftAssigned++;
                    $results[] = ['transaction_id' => $transaction->id, 'action' => 'draft', 'members' => array_map(fn($m) => $m->name, $phoneMatches), 'reason' => 'Multiple phone matches'];
                    continue;
                }
            }

            // Strategy 1.5: For Paybill transactions, match by name + last 3 digits of phone
            // This is the primary matching strategy for Paybill (should auto-assign ~90% of transactions)
            if ($transaction->transaction_type === 'M-Pesa Paybill' && $parsed['member_name']) {
                $accountName = $this->parserService->normalizeName($parsed['member_name']);
                $phoneLast3 = $parsed['phone_last_3_digits'] ?? null;
                
                $paybillMatches = [];
                
                foreach ($members as $member) {
                    $memberName = $this->parserService->normalizeName($member->name);
                    $nameScore = $this->parserService->compareNames($accountName, $memberName);
                    
                    // Check if at least one name matches (score >= 0.6)
                    if ($nameScore >= 0.6) {
                        $phoneMatch = false;
                        
                        // Check last 3 digits of phone if available
                        if ($phoneLast3 && $member->phone) {
                            $memberPhone = $this->parserService->normalizePhone($member->phone);
                            // Get last 3 digits of member phone (ensure it's a string comparison)
                            $memberPhoneLast3 = substr($memberPhone, -3);
                            
                            // Compare as strings (case-insensitive, but they're digits)
                            if (strval($phoneLast3) === strval($memberPhoneLast3)) {
                                $phoneMatch = true;
                            }
                        }
                        
                        // For Paybill: if name matches AND phone matches, it's a strong match
                        if ($phoneMatch) {
                            // Name matches AND phone matches - STRONG MATCH (100% confidence)
                            $paybillMatches[] = [
                                'member' => $member,
                                'name_score' => $nameScore,
                                'phone_match' => true,
                                'confidence' => 1.0, // 100% confidence
                            ];
                        } elseif (!$phoneLast3) {
                            // Name matches but no phone in transaction - still a good match
                            $paybillMatches[] = [
                                'member' => $member,
                                'name_score' => $nameScore,
                                'phone_match' => false,
                                'confidence' => $nameScore, // Use name score as confidence
                            ];
                        } elseif ($nameScore >= 0.7) {
                            // Name matches but phone doesn't - consider for draft if high name score
                            $paybillMatches[] = [
                                'member' => $member,
                                'name_score' => $nameScore,
                                'phone_match' => false,
                                'confidence' => $nameScore * 0.7, // Lower confidence due to phone mismatch
                            ];
                        }
                    }
                }
                
                // Sort by confidence descending (phone matches first, then name score)
                usort($paybillMatches, function($a, $b) {
                    // First sort by phone match (true first), then by confidence
                    if ($a['phone_match'] !== $b['phone_match']) {
                        return $b['phone_match'] ? 1 : -1;
                    }
                    return $b['confidence'] <=> $a['confidence'];
                });
                
                // Filter to only phone matches if any exist
                $phoneMatches = array_filter($paybillMatches, fn($m) => $m['phone_match']);
                
                if (count($phoneMatches) === 1) {
                    // Single match with phone - AUTO ASSIGN (100% confidence)
                    $member = $phoneMatches[0]['member'];
                    $transaction->update([
                        'member_id' => $member->id,
                        'assignment_status' => 'auto_assigned',
                        'match_confidence' => 1.0,
                        'draft_member_ids' => null,
                    ]);

                    TransactionMatchLog::create([
                        'transaction_id' => $transaction->id,
                        'member_id' => $member->id,
                        'confidence' => 1.0,
                        'match_reason' => 'Paybill: Name match + last 3 digits phone match',
                        'source' => 'auto',
                        'user_id' => $request->user()->id,
                    ]);

                    $autoAssigned++;
                    $results[] = ['transaction_id' => $transaction->id, 'action' => 'auto_assigned', 'member' => $member->name, 'reason' => 'Paybill: Name + phone last 3 digits match'];
                    continue;
                } elseif (count($paybillMatches) === 1 && !$paybillMatches[0]['phone_match']) {
                    // Single match, no phone match but name matches - AUTO ASSIGN if name score is high
                    if ($paybillMatches[0]['name_score'] >= 0.75) {
                        $member = $paybillMatches[0]['member'];
                        $transaction->update([
                            'member_id' => $member->id,
                            'assignment_status' => 'auto_assigned',
                            'match_confidence' => $paybillMatches[0]['confidence'],
                            'draft_member_ids' => null,
                        ]);

                        TransactionMatchLog::create([
                            'transaction_id' => $transaction->id,
                            'member_id' => $member->id,
                            'confidence' => $paybillMatches[0]['confidence'],
                            'match_reason' => 'Paybill: Name match (high confidence, no phone)',
                            'source' => 'auto',
                            'user_id' => $request->user()->id,
                        ]);

                        $autoAssigned++;
                        $results[] = ['transaction_id' => $transaction->id, 'action' => 'auto_assigned', 'member' => $member->name, 'reason' => 'Paybill: Name match (high confidence)'];
                        continue;
                    } else {
                        // Lower confidence - draft assign
                        $draftMemberIds = [$paybillMatches[0]['member']->id];
                        $transaction->update([
                            'assignment_status' => 'draft',
                            'draft_member_ids' => $draftMemberIds,
                            'match_confidence' => $paybillMatches[0]['confidence'],
                        ]);
                        $draftAssigned++;
                        $results[] = [
                            'transaction_id' => $transaction->id, 
                            'action' => 'draft', 
                            'members' => [$paybillMatches[0]['member']->name], 
                            'reason' => 'Paybill: Name match (moderate confidence, no phone)'
                        ];
                        continue;
                    }
                } elseif (count($paybillMatches) > 1) {
                    // Multiple matches - check if all have phone matches
                    $allHavePhoneMatch = count(array_filter($paybillMatches, fn($m) => $m['phone_match'])) === count($paybillMatches);
                    
                    if ($allHavePhoneMatch && count($paybillMatches) === count($phoneMatches)) {
                        // All matches have phone match - this shouldn't happen, but if it does, draft assign
                        $draftMemberIds = array_map(fn($m) => $m['member']->id, $paybillMatches);
                        $transaction->update([
                            'assignment_status' => 'draft',
                            'draft_member_ids' => $draftMemberIds,
                            'match_confidence' => $paybillMatches[0]['confidence'],
                        ]);
                        $draftAssigned++;
                        $results[] = [
                            'transaction_id' => $transaction->id, 
                            'action' => 'draft', 
                            'members' => array_map(fn($m) => $m['member']->name, $paybillMatches), 
                            'reason' => 'Paybill: Multiple name + phone matches'
                        ];
                        continue;
                    } else {
                        // Multiple matches with mixed phone matches - draft assign
                        $draftMemberIds = array_map(fn($m) => $m['member']->id, $paybillMatches);
                        $transaction->update([
                            'assignment_status' => 'draft',
                            'draft_member_ids' => $draftMemberIds,
                            'match_confidence' => $paybillMatches[0]['confidence'],
                        ]);
                        $draftAssigned++;
                        $results[] = [
                            'transaction_id' => $transaction->id, 
                            'action' => 'draft', 
                            'members' => array_map(fn($m) => $m['member']->name, $paybillMatches), 
                            'reason' => 'Paybill: Multiple name matches'
                        ];
                        continue;
                    }
                } elseif (count($phoneMatches) > 1) {
                    // Multiple phone matches - draft assign
                    $draftMemberIds = array_map(fn($m) => $m['member']->id, $phoneMatches);
                    $transaction->update([
                        'assignment_status' => 'draft',
                        'draft_member_ids' => $draftMemberIds,
                        'match_confidence' => 1.0,
                    ]);
                    $draftAssigned++;
                    $results[] = [
                        'transaction_id' => $transaction->id, 
                        'action' => 'draft', 
                        'members' => array_map(fn($m) => $m['member']->name, $phoneMatches), 
                        'reason' => 'Paybill: Multiple name + phone matches'
                    ];
                    continue;
                }
            }

            // Strategy 2: Name match (for non-Paybill or if Paybill account name didn't match)
            if ($parsed['member_name']) {
                $nameMatches = [];
                $bestNameScore = 0;

                foreach ($members as $member) {
                    $nameScore = $this->parserService->compareNames($parsed['member_name'], $member->name);
                    if ($nameScore >= 0.6) {
                        $nameMatches[] = ['member' => $member, 'score' => $nameScore];
                        $bestNameScore = max($bestNameScore, $nameScore);
                    }
                }

                if (!empty($nameMatches)) {
                    // Check if any matched members have different phone numbers
                    $hasPhoneConflict = false;
                    if (!empty($parsed['phone_numbers'])) {
                        $normalizedTxPhones = array_map([$this->parserService, 'normalizePhone'], $parsed['phone_numbers']);
                        foreach ($nameMatches as $match) {
                            $member = $match['member'];
                            if ($member->phone) {
                                $normalizedMemberPhone = $this->parserService->normalizePhone($member->phone);
                                if (!in_array($normalizedMemberPhone, $normalizedTxPhones)) {
                                    $hasPhoneConflict = true;
                                    break;
                                }
                            }
                        }
                    }

                    if ($hasPhoneConflict || count($nameMatches) > 1) {
                        // Name matches but phone conflict or multiple name matches - draft assign
                        $draftMemberIds = array_map(fn($m) => $m['member']->id, $nameMatches);
                        $transaction->update([
                            'assignment_status' => 'draft',
                            'draft_member_ids' => $draftMemberIds,
                            'match_confidence' => $bestNameScore,
                        ]);
                        $draftAssigned++;
                        $results[] = [
                            'transaction_id' => $transaction->id,
                            'action' => 'draft',
                            'members' => array_map(fn($m) => $m['member']->name, $nameMatches),
                            'reason' => $hasPhoneConflict ? 'Name match but phone conflict' : 'Multiple name matches'
                        ];
                        continue;
                    } elseif (count($nameMatches) === 1 && empty($parsed['phone_numbers'])) {
                        // Single name match, no phone - auto assign if high confidence
                        if ($bestNameScore >= 0.8) {
                            $member = $nameMatches[0]['member'];
                            $transaction->update([
                                'member_id' => $member->id,
                                'assignment_status' => 'auto_assigned',
                                'match_confidence' => $bestNameScore,
                                'draft_member_ids' => null,
                            ]);

                            TransactionMatchLog::create([
                                'transaction_id' => $transaction->id,
                                'member_id' => $member->id,
                                'confidence' => $bestNameScore,
                                'match_reason' => 'Name match (high confidence)',
                                'source' => 'auto',
                                'user_id' => $request->user()->id,
                            ]);

                            $autoAssigned++;
                            $results[] = ['transaction_id' => $transaction->id, 'action' => 'auto_assigned', 'member' => $member->name, 'reason' => 'Name match'];
                            continue;
                        } else {
                            // Low confidence - draft
                            $member = $nameMatches[0]['member'];
                            $transaction->update([
                                'assignment_status' => 'draft',
                                'draft_member_ids' => [$member->id],
                                'match_confidence' => $bestNameScore,
                            ]);
                            $draftAssigned++;
                            $results[] = ['transaction_id' => $transaction->id, 'action' => 'draft', 'members' => [$member->name], 'reason' => 'Name match (low confidence)'];
                            continue;
                        }
                    }
                }
            }

            // Strategy 3: Member number match
            if ($parsed['member_number']) {
                $memberByNumber = Member::where('member_number', $parsed['member_number'])
                    ->orWhere('member_code', $parsed['member_number'])
                    ->first();
                
                if ($memberByNumber) {
                    $transaction->update([
                        'member_id' => $memberByNumber->id,
                        'assignment_status' => 'auto_assigned',
                        'match_confidence' => 0.98,
                        'draft_member_ids' => null,
                    ]);

                    TransactionMatchLog::create([
                        'transaction_id' => $transaction->id,
                        'member_id' => $memberByNumber->id,
                        'confidence' => 0.98,
                        'match_reason' => 'Member number match',
                        'source' => 'auto',
                        'user_id' => $request->user()->id,
                    ]);

                    $autoAssigned++;
                    $results[] = ['transaction_id' => $transaction->id, 'action' => 'auto_assigned', 'member' => $memberByNumber->name, 'reason' => 'Member number match'];
                    continue;
                }
            }
        }

        return response()->json([
            'message' => "Auto-assignment completed",
            'auto_assigned' => $autoAssigned,
            'draft_assigned' => $draftAssigned,
            'debit_transactions_deleted' => $deletedCount,
            'total' => $transactions->count(),
            'results' => $results,
        ]);
    }

    public function bulkAssign(Request $request)
    {
        $request->validate([
            'assignments' => 'required|array|min:1',
            'assignments.*.transaction_id' => 'required|exists:transactions,id',
            'assignments.*.member_id' => 'required|exists:members,id',
        ]);

        $assigned = 0;
        $errors = [];

        foreach ($request->assignments as $assignment) {
            try {
                $transaction = Transaction::findOrFail($assignment['transaction_id']);
                
                $transaction->update([
                    'member_id' => $assignment['member_id'],
                    'assignment_status' => 'manual_assigned',
                    'match_confidence' => 1.0,
                    'draft_member_ids' => null,
                ]);

                TransactionMatchLog::create([
                    'transaction_id' => $transaction->id,
                    'member_id' => $assignment['member_id'],
                    'confidence' => 1.0,
                    'match_reason' => 'Bulk manual assignment',
                    'source' => 'manual',
                    'user_id' => $request->user()->id,
                ]);

                $assigned++;
            } catch (\Exception $e) {
                $errors[] = [
                    'transaction_id' => $assignment['transaction_id'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => "Bulk assignment completed",
            'assigned' => $assigned,
            'errors' => $errors,
        ]);
    }
}

