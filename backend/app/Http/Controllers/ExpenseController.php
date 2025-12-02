<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['transaction', 'members']);

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('date_from')) {
            $query->where('expense_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('expense_date', '<=', $request->date_to);
        }

        if ($request->has('member_id')) {
            $query->whereHas('members', fn($q) => $q->where('members.id', $request->member_id));
        }

        return response()->json($query->orderBy('expense_date', 'desc')->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_id' => 'nullable|exists:transactions,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'category' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'assign_to_all_members' => 'boolean',
            'amount_per_member' => 'nullable|numeric|min:0',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:members,id',
        ]);

        $validated['requested_by'] = auth()->id();
        $validated['approval_status'] = 'pending';
        
        $expense = Expense::create($validated);
        
        // Assign to members
        if ($validated['assign_to_all_members'] ?? false) {
            $members = \App\Models\Member::where('is_active', true)->get();
            $amountPerMember = $validated['amount_per_member'] ?? ($validated['amount'] / $members->count());
            
            foreach ($members as $member) {
                $expense->members()->attach($member->id, ['amount' => $amountPerMember]);
            }
        } elseif (!empty($validated['member_ids'])) {
            $amountPerMember = $validated['amount_per_member'] ?? ($validated['amount'] / count($validated['member_ids']));
            
            foreach ($validated['member_ids'] as $memberId) {
                $expense->members()->attach($memberId, ['amount' => $amountPerMember]);
            }
        }
        
        $expense->load(['transaction', 'members']);

        return response()->json($expense, 201);
    }

    public function show(Expense $expense)
    {
        $expense->load('transaction');
        return response()->json($expense);
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'transaction_id' => 'nullable|exists:transactions,id',
            'description' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'expense_date' => 'sometimes|required|date',
            'category' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $expense->update($validated);
        $expense->load('transaction');

        return response()->json($expense);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully']);
    }
    
    public function approve(Request $request, Expense $expense)
    {
        if ($expense->isApproved()) {
            return response()->json(['message' => 'Expense is already approved'], 422);
        }
        
        if ($expense->isRejected()) {
            return response()->json(['message' => 'Cannot approve a rejected expense'], 422);
        }
        
        // Prevent self-approval
        if ($expense->requested_by === auth()->id()) {
            return response()->json(['message' => 'You cannot approve your own expense request'], 422);
        }
        
        $expense->update([
            'approval_status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
            'rejection_reason' => null,
            'rejected_by' => null,
            'rejected_at' => null,
        ]);
        
        $expense->load(['requestedBy', 'approvedBy']);
        
        return response()->json([
            'message' => 'Expense approved successfully',
            'expense' => $expense,
        ]);
    }
    
    public function reject(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);
        
        if ($expense->isApproved()) {
            return response()->json(['message' => 'Cannot reject an approved expense'], 422);
        }
        
        if ($expense->isRejected()) {
            return response()->json(['message' => 'Expense is already rejected'], 422);
        }
        
        $expense->update([
            'approval_status' => 'rejected',
            'rejected_by' => auth()->id(),
            'rejected_at' => now(),
            'rejection_reason' => $validated['reason'],
        ]);
        
        $expense->load(['requestedBy', 'rejectedBy']);
        
        return response()->json([
            'message' => 'Expense rejected successfully',
            'expense' => $expense,
        ]);
    }
}


