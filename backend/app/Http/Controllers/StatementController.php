<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBankStatement;
use App\Models\BankStatement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StatementController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = BankStatement::query()
                ->withCount('transactions')
                ->withSum('transactions as total_credit', 'credit')
                ->withSum('transactions as total_debit', 'debit');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $statements = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 20));
            
            // Manually handle raw_metadata to avoid JSON casting errors
            $statements->getCollection()->transform(function ($statement) {
                try {
                    // Force access to trigger accessor
                    $metadata = $statement->getAttribute('raw_metadata');
                } catch (\Exception $e) {
                    // If there's an error, set it to null
                    $statement->setAttribute('raw_metadata', null);
                }

                $statement->total_credit = (float) ($statement->total_credit ?? 0);
                $statement->total_debit = (float) ($statement->total_debit ?? 0);

                return $statement;
            });
            
            return response()->json($statements);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Error in statements index: " . $e->getMessage());
            return response()->json([
                'message' => 'Error loading statements',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    public function show(BankStatement $statement)
    {
        $transactionsQuery = $statement->transactions();

        $aggregate = (clone $transactionsQuery)
            ->selectRaw('COUNT(*) as total_transactions, SUM(credit) as total_credit, SUM(debit) as total_debit, MIN(tran_date) as first_tran_date, MAX(tran_date) as last_tran_date')
            ->first();

        $assignmentBreakdown = (clone $transactionsQuery)
            ->selectRaw("COALESCE(assignment_status, 'unassigned') as status, COUNT(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status')
            ->map(fn ($count) => (int) $count)
            ->toArray();

        $archivedCount = (clone $transactionsQuery)->where('is_archived', true)->count();
        $unassignedMembers = (clone $transactionsQuery)->whereNull('member_id')->count();
        $duplicateCount = $statement->duplicates()->count();

        return response()->json(array_merge($statement->toArray(), [
            'metrics' => [
                'total_transactions' => (int) ($aggregate->total_transactions ?? 0),
                'total_credit' => (float) ($aggregate->total_credit ?? 0),
                'total_debit' => (float) ($aggregate->total_debit ?? 0),
                'first_transaction_date' => $aggregate->first_tran_date ? \Illuminate\Support\Carbon::parse($aggregate->first_tran_date)->toDateString() : null,
                'last_transaction_date' => $aggregate->last_tran_date ? \Illuminate\Support\Carbon::parse($aggregate->last_tran_date)->toDateString() : null,
                'assignment_breakdown' => array_merge([
                    'auto_assigned' => 0,
                    'manual_assigned' => 0,
                    'draft' => 0,
                    'unassigned' => 0,
                    'duplicate' => 0,
                    'transferred' => 0,
                ], $assignmentBreakdown),
                'archived_transactions' => $archivedCount,
                'unassigned_members' => $unassignedMembers,
                'duplicates' => $duplicateCount,
            ],
        ]));
    }

    public function documentMetadata(BankStatement $statement)
    {
        $statement->load(['transactions.member', 'duplicates.transaction']);
        $transactionsCollection = $statement->transactions;
        $duplicatesCollection = $statement->duplicates;

        $transactions = $statement->transactions->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'tran_date' => $transaction->tran_date?->toDateString(),
                'particulars' => $transaction->particulars,
                'credit' => $transaction->credit,
                'debit' => $transaction->debit,
                'transaction_code' => $transaction->transaction_code,
                'assignment_status' => $transaction->assignment_status,
                'is_archived' => $transaction->is_archived,
                'match_confidence' => $transaction->match_confidence,
                'member' => $transaction->member ? [
                    'id' => $transaction->member->id,
                    'name' => $transaction->member->name,
                    'phone' => $transaction->member->phone,
                ] : null,
                'metadata' => [
                    'page_number' => $transaction->raw_json['page_number'] ?? null,
                    'row_index' => $transaction->raw_json['row_index'] ?? null,
                    'phones' => $transaction->phones,
                ],
            ];
        });

        $duplicates = $statement->duplicates->map(function ($duplicate) {
            return [
                'id' => $duplicate->id,
                'page_number' => $duplicate->page_number,
                'transaction_code' => $duplicate->transaction_code,
                'tran_date' => optional($duplicate->tran_date)?->toDateString(),
                'credit' => $duplicate->credit,
                'debit' => $duplicate->debit,
                'duplicate_reason' => $duplicate->duplicate_reason,
                'particulars_snapshot' => $duplicate->particulars_snapshot,
                'metadata' => $duplicate->metadata,
                'existing_transaction' => $duplicate->transaction ? [
                    'id' => $duplicate->transaction->id,
                    'assignment_status' => $duplicate->transaction->assignment_status,
                    'statement_id' => $duplicate->transaction->bank_statement_id,
                    'member_id' => $duplicate->transaction->member_id,
                ] : null,
            ];
        });

        $totalCredit = $transactionsCollection->sum(function ($transaction) {
            return (float) $transaction->credit;
        });

        $totalDebit = $transactionsCollection->sum(function ($transaction) {
            return (float) $transaction->debit;
        });

        $firstTransaction = $transactionsCollection->sortBy('tran_date')->first();
        $lastTransaction = $transactionsCollection->sortByDesc('tran_date')->first();

        $assignmentBreakdown = $transactionsCollection
            ->groupBy(function ($transaction) {
                return $transaction->assignment_status ?? 'unassigned';
            })
            ->map(function ($group) {
                return $group->count();
            })
            ->map(fn ($count) => (int) $count)
            ->toArray();

        $metrics = [
            'total_transactions' => $transactionsCollection->count(),
            'total_credit' => $totalCredit,
            'total_debit' => $totalDebit,
            'first_transaction_date' => optional($firstTransaction?->tran_date)->toDateString(),
            'last_transaction_date' => optional($lastTransaction?->tran_date)->toDateString(),
            'assignment_breakdown' => array_merge([
                'auto_assigned' => 0,
                'manual_assigned' => 0,
                'draft' => 0,
                'unassigned' => 0,
                'duplicate' => 0,
                'transferred' => 0,
            ], $assignmentBreakdown),
            'archived_transactions' => $transactionsCollection->where('is_archived', true)->count(),
            'unassigned_members' => $transactionsCollection->whereNull('member_id')->count(),
            'duplicates' => $duplicatesCollection->count(),
        ];

        // Build document URL manually to avoid route name resolution issues
        $documentUrl = url("/api/v1/admin/statements/{$statement->id}/document");
        
        return response()->json([
            'statement' => [
                'id' => $statement->id,
                'filename' => $statement->filename,
                'file_url' => null,
                'document_url' => "/api/v1/admin/statements/{$statement->id}/document",
                'document_absolute_url' => $documentUrl,
                'status' => $statement->status,
                'statement_date' => optional($statement->statement_date)?->toDateString(),
                'uploaded_at' => $statement->created_at?->toDateTimeString(),
            ],
            'transactions' => $transactions,
            'duplicates' => $duplicates,
            'metrics' => $metrics,
        ]);
    }

    public function document(BankStatement $statement)
    {
        if (!$statement->file_path) {
            \Illuminate\Support\Facades\Log::warning("Statement {$statement->id} has no file_path");
            abort(404, 'Statement file not found');
        }

        if (!Storage::disk('statements')->exists($statement->file_path)) {
            \Illuminate\Support\Facades\Log::warning("Statement {$statement->id} file missing", [
                'file_path' => $statement->file_path,
                'storage_root' => Storage::disk('statements')->path(''),
            ]);
            abort(404, 'Statement file not found in storage');
        }

        $filePath = Storage::disk('statements')->path($statement->file_path);
        
        if (!is_readable($filePath)) {
            \Illuminate\Support\Facades\Log::error("Statement {$statement->id} file not readable", [
                'file_path' => $filePath,
            ]);
            abort(500, 'Statement file cannot be read');
        }

        return response()->file(
            $filePath,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . addslashes($statement->filename ?? 'statement.pdf') . '"',
            ]
        );
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . $file->getClientOriginalName();
        $filePath = $file->storeAs('', $filename, 'statements');
        $fileHash = hash_file('sha256', Storage::disk('statements')->path($filePath));

        // Check for duplicates
        $existing = BankStatement::where('file_hash', $fileHash)->first();
        if ($existing) {
            Storage::disk('statements')->delete($filePath);
            return response()->json([
                'message' => 'This file has already been uploaded',
                'statement' => $existing,
            ], 409);
        }

        $statement = BankStatement::create([
            'filename' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_hash' => $fileHash,
            'status' => 'uploaded',
        ]);

        // Queue processing job
        ProcessBankStatement::dispatch($statement);

        return response()->json($statement, 201);
    }

    public function destroy(BankStatement $statement)
    {
        // Delete file
        Storage::disk('statements')->delete($statement->file_path);
        
        // Delete statement (transactions will be cascade deleted)
        $statement->delete();

        return response()->json(['message' => 'Statement deleted successfully']);
    }

    public function reanalyze(BankStatement $statement)
    {
        // Delete existing transactions for this statement
        $statement->transactions()->delete();
        $statement->duplicates()->delete();
        
        // Reset statement status - use DB::table to set JSON to null properly
        DB::table('bank_statements')
            ->where('id', $statement->id)
            ->update([
                'status' => 'uploaded',
                'error_message' => null,
                'raw_metadata' => null,
            ]);
        
        // Refresh the model
        $statement->refresh();
        
        // Queue processing job
        ProcessBankStatement::dispatch($statement);
        
        return response()->json([
            'message' => 'Statement queued for re-analysis',
            'statement' => $statement->fresh(),
        ]);
    }

    public function reanalyzeAll(Request $request)
    {
        $statements = BankStatement::whereIn('status', ['completed', 'failed'])->get();
        
        $count = 0;
        foreach ($statements as $statement) {
            try {
                // Delete existing transactions
                $statement->transactions()->delete();
                $statement->duplicates()->delete();
                
                // Reset status using DB query to avoid JSON casting issues
                DB::table('bank_statements')
                    ->where('id', $statement->id)
                    ->update([
                        'status' => 'uploaded',
                        'error_message' => null,
                        'raw_metadata' => null,
                    ]);
                
                // Refresh and queue processing
                $statement->refresh();
                ProcessBankStatement::dispatch($statement);
                $count++;
            } catch (\Exception $e) {
                // Log error but continue with other statements
                \Illuminate\Support\Facades\Log::error("Failed to reanalyze statement {$statement->id}: " . $e->getMessage());
            }
        }
        
        return response()->json([
            'message' => "{$count} statements queued for re-analysis",
            'count' => $count,
        ]);
    }
}
