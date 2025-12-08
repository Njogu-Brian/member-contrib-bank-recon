<?php

namespace App\Http\Controllers;

use App\Models\SavingsGoal;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Services\AuditLogger;

class SavingsGoalController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = SavingsGoal::with('member');

        if ($request->has('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:members,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'target_amount' => 'required|numeric|min:0.01',
            'current_amount' => 'nullable|numeric|min:0',
            'target_date' => 'nullable|date|after_or_equal:today',
            'start_date' => 'nullable|date',
            'monthly_contribution' => 'nullable|numeric|min:0',
            'metadata' => 'nullable|array',
        ]);

        $validated['current_amount'] = $validated['current_amount'] ?? 0;
        $validated['start_date'] = $validated['start_date'] ?? now();
        $validated['status'] = 'active';

        $goal = DB::transaction(function () use ($validated) {
            $goal = SavingsGoal::create($validated);
            $this->auditLogger->log(auth()->id(), 'savings_goal.created', $goal, $validated);
            return $goal;
        });

        return response()->json($goal->load('member'), 201);
    }

    public function show(SavingsGoal $savingsGoal): JsonResponse
    {
        return response()->json($savingsGoal->load('member'));
    }

    public function update(Request $request, SavingsGoal $savingsGoal): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'target_amount' => 'sometimes|required|numeric|min:0.01',
            'target_date' => 'nullable|date',
            'status' => 'sometimes|in:active,completed,cancelled,paused',
            'monthly_contribution' => 'nullable|numeric|min:0',
            'metadata' => 'nullable|array',
        ]);

        // If target_amount is updated and current_amount exceeds it, mark as completed
        if (isset($validated['target_amount']) && $savingsGoal->current_amount >= $validated['target_amount']) {
            $validated['status'] = 'completed';
        }

        $savingsGoal->update($validated);
        $this->auditLogger->log(auth()->id(), 'savings_goal.updated', $savingsGoal, $validated);

        return response()->json($savingsGoal->fresh('member'));
    }

    public function destroy(SavingsGoal $savingsGoal): JsonResponse
    {
        $savingsGoal->delete();
        $this->auditLogger->log(auth()->id(), 'savings_goal.deleted', $savingsGoal);

        return response()->json(['message' => 'Savings goal deleted successfully']);
    }

    /**
     * Add contribution to savings goal
     */
    public function addContribution(Request $request, SavingsGoal $savingsGoal): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        if (!$savingsGoal->isActive()) {
            return response()->json([
                'message' => 'Cannot add contribution to a non-active savings goal',
            ], 422);
        }

        DB::transaction(function () use ($savingsGoal, $validated) {
            $savingsGoal->addContribution($validated['amount']);
            $this->auditLogger->log(auth()->id(), 'savings_goal.contribution_added', $savingsGoal, $validated);
        });

        return response()->json([
            'message' => 'Contribution added successfully',
            'goal' => $savingsGoal->fresh('member'),
        ]);
    }
}

