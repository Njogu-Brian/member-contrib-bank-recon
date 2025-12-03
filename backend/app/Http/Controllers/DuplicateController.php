<?php

namespace App\Http\Controllers;

use App\Models\StatementDuplicate;
use App\Models\Transaction;
use App\Models\BankStatement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class DuplicateController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 25);
        $perPage = max(1, min(100, $perPage));

        // Get duplicates from statement_duplicates table
        $query = StatementDuplicate::with(['statement', 'transaction.member'])
            ->orderByDesc('id');

        if ($request->filled('statement_id')) {
            $query->where('bank_statement_id', $request->input('statement_id'));
        }

        if ($request->filled('reason')) {
            $query->where('duplicate_reason', $request->input('reason'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('particulars_snapshot', 'like', "%{$search}%")
                    ->orWhere('transaction_code', 'like', "%{$search}%");
            });
        }

        $duplicates = $query->paginate($perPage);

        // Return duplicates with flat structure for frontend
        $duplicates->getCollection()->transform(function (StatementDuplicate $duplicate) {
            return [
                'id' => $duplicate->id,
                'bank_statement_id' => $duplicate->bank_statement_id,
                'transaction_id' => $duplicate->transaction_id,
                'page_number' => $duplicate->page_number,
                'transaction_code' => $duplicate->transaction_code,
                'tran_date' => $duplicate->tran_date,
                'credit' => $duplicate->credit,
                'debit' => $duplicate->debit,
                'duplicate_reason' => $duplicate->duplicate_reason,
                'particulars_snapshot' => $duplicate->particulars_snapshot,
                'metadata' => $duplicate->metadata,
                'created_at' => $duplicate->created_at,
                'updated_at' => $duplicate->updated_at,
                'transaction' => $duplicate->transaction ? [
                    'id' => $duplicate->transaction->id,
                    'bank_statement_id' => $duplicate->transaction->bank_statement_id,
                    'tran_date' => $duplicate->transaction->tran_date,
                    'value_date' => $duplicate->transaction->value_date,
                    'particulars' => $duplicate->transaction->particulars,
                    'credit' => $duplicate->transaction->credit,
                    'debit' => $duplicate->transaction->debit,
                    'balance' => $duplicate->transaction->balance,
                    'transaction_code' => $duplicate->transaction->transaction_code,
                    'assignment_status' => $duplicate->transaction->assignment_status,
                    'member_id' => $duplicate->transaction->member_id,
                    'member' => $duplicate->transaction->member ? [
                        'id' => $duplicate->transaction->member->id,
                        'name' => $duplicate->transaction->member->name,
                        'member_code' => $duplicate->transaction->member->member_code,
                        'phone' => $duplicate->transaction->member->phone,
                    ] : null,
                ] : null,
                'statement' => $duplicate->statement ? [
                    'id' => $duplicate->statement->id,
                    'filename' => $duplicate->statement->filename,
                    'file_path' => $duplicate->statement->file_path,
                    'status' => $duplicate->statement->status,
                    'created_at' => $duplicate->statement->created_at,
                    'updated_at' => $duplicate->statement->updated_at,
                ] : null,
            ];
        });

        return response()->json($duplicates);
    }

    public function reanalyze(Request $request)
    {
        $statementId = $request->input('statement_id');

        try {
            Artisan::call('evimeria:reanalyze-duplicates', [
                '--statement-id' => $statementId,
            ]);

            $output = Artisan::output();

            return response()->json([
                'message' => 'Duplicate reanalysis completed successfully',
                'output' => $output,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to reanalyze duplicates',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}


