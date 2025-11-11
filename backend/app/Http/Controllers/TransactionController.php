<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionMatchLog;
use App\Services\MatchingService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        protected MatchingService $matchingService
    ) {}

    public function index(Request $request)
    {
        $query = Transaction::with(['member', 'bankStatement']);

        if ($request->has('status')) {
            $query->where('assignment_status', $request->status);
        }

        if ($request->has('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('particulars', 'like', "%{$search}%")
                    ->orWhere('transaction_code', 'like', "%{$search}%");
            });
        }

        $transactions = $query->orderBy('tran_date', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($transactions);
    }

    public function show(Transaction $transaction)
    {
        $transaction->load(['member', 'bankStatement', 'matchLogs.member', 'matchLogs.user']);

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
}

