<?php

namespace App\Http\Controllers;

use App\Models\StatementDuplicate;
use Illuminate\Http\Request;

class DuplicateController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 25);
        $perPage = max(1, min(100, $perPage));

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

        $duplicates->getCollection()->transform(function (StatementDuplicate $duplicate) {
            $original = $duplicate->transaction;

            return [
                'id' => $duplicate->id,
                'reason' => $duplicate->duplicate_reason,
                'statement' => $duplicate->statement ? [
                    'id' => $duplicate->statement->id,
                    'filename' => $duplicate->statement->filename,
                    'uploaded_at' => optional($duplicate->statement->created_at)->toDateTimeString(),
                ] : null,
                'duplicate' => [
                    'tran_date' => optional($duplicate->tran_date)->toDateString(),
                    'credit' => $duplicate->credit,
                    'debit' => $duplicate->debit,
                    'particulars' => $duplicate->particulars_snapshot,
                    'page_number' => $duplicate->page_number,
                    'transaction_code' => $duplicate->transaction_code,
                    'raw' => $duplicate->metadata['raw_transaction'] ?? null,
                ],
                'original_transaction' => $original ? [
                    'id' => $original->id,
                    'tran_date' => optional($original->tran_date)->toDateString(),
                    'credit' => $original->credit,
                    'debit' => $original->debit,
                    'particulars' => $original->particulars,
                    'assignment_status' => $original->assignment_status,
                    'member' => $original->member ? [
                        'id' => $original->member->id,
                        'name' => $original->member->name,
                        'phone' => $original->member->phone,
                    ] : null,
                    'statement_id' => $original->bank_statement_id,
                ] : null,
                'created_at' => optional($duplicate->created_at)->toDateTimeString(),
            ];
        });

        return response()->json($duplicates);
    }
}


