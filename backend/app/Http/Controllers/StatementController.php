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

        // Check for duplicates
        $existing = BankStatement::where('file_hash', $fileHash)->first();
        if ($existing) {
            return response()->json([
                'message' => 'This file has already been uploaded',
                'statement' => $existing,
            ], 409);
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
}

