<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBankStatement;
use App\Models\BankStatement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class StatementController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = BankStatement::query()->withCount('transactions');

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
        $statement->load('transactions');
        return response()->json($statement);
    }

    public function documentMetadata(BankStatement $statement)
    {
        $statement->load(['transactions.member', 'duplicates.transaction']);

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

        return response()->json([
            'statement' => [
                'id' => $statement->id,
                'filename' => $statement->filename,
                'file_url' => null,
                'document_url' => route('statements.document', $statement, absolute: false),
                'document_absolute_url' => route('statements.document', $statement),
                'status' => $statement->status,
                'statement_date' => optional($statement->statement_date)?->toDateString(),
                'uploaded_at' => $statement->created_at?->toDateTimeString(),
            ],
            'transactions' => $transactions,
            'duplicates' => $duplicates,
        ]);
    }

    public function document(BankStatement $statement)
    {
        if (!$statement->file_path || !Storage::disk('statements')->exists($statement->file_path)) {
            abort(404, 'Statement file not found');
        }

        return response()->file(
            Storage::disk('statements')->path($statement->file_path),
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
        $filePath = $file->storeAs('statements', $filename, 'statements');
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
