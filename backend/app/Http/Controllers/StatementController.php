<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBankStatement;
use App\Models\BankStatement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StatementController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        $file = $request->file('file');
        $filename = $file->getClientOriginalName();
        $fileHash = hash_file('sha256', $file->getRealPath());

        // Check for duplicates (informational only - allow re-upload)
        $existing = BankStatement::where('file_hash', $fileHash)->first();
        if ($existing) {
            // Return existing statement info but allow upload to proceed
            // User can delete the old one if needed
        }

        $path = $file->store('statements', 'local');

        $statement = BankStatement::create([
            'filename' => $filename,
            'file_path' => $path,
            'file_hash' => $fileHash,
            'status' => 'uploaded',
        ]);

        // Dispatch job to process the statement
        ProcessBankStatement::dispatch($statement);

        return response()->json([
            'message' => 'Statement uploaded successfully',
            'statement' => $statement,
        ], 201);
    }

    public function index(Request $request)
    {
        $statements = BankStatement::withCount('transactions')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($statements);
    }

    public function show(BankStatement $statement)
    {
        $statement->load('transactions.member');

        return response()->json($statement);
    }

    public function destroy(BankStatement $statement)
    {
        // Delete ALL associated transactions (assigned or not)
        // This includes transactions, transaction splits, and match logs
        $transactionIds = $statement->transactions()->pluck('id');
        
        if ($transactionIds->isNotEmpty()) {
            // Delete transaction splits
            \App\Models\TransactionSplit::whereIn('transaction_id', $transactionIds)->delete();
            
            // Delete transaction match logs
            \App\Models\TransactionMatchLog::whereIn('transaction_id', $transactionIds)->delete();
            
            // Delete transactions
            $statement->transactions()->delete();
        }

        // Delete the file from storage
        if ($statement->file_path && Storage::exists($statement->file_path)) {
            Storage::delete($statement->file_path);
        }

        // Delete the statement record
        $statement->delete();

        return response()->json(['message' => 'Statement and all associated transactions deleted successfully']);
    }
}

