<?php

namespace App\Http\Controllers;

use App\Models\ManualContribution;
use Illuminate\Http\Request;

class ManualContributionController extends Controller
{
    public function index(Request $request)
    {
        $query = ManualContribution::with(['member', 'creator']);

        if ($request->has('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->has('date_from')) {
            $query->where('contribution_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('contribution_date', '<=', $request->date_to);
        }

        $contributions = $query->orderBy('contribution_date', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($contributions);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:members,id',
            'amount' => 'required|numeric|min:0.01',
            'contribution_date' => 'required|date',
            'payment_method' => 'nullable|string|in:cash,mpesa,bank_transfer,other',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = $request->user()->id;
        $validated['payment_method'] = $validated['payment_method'] ?? 'cash';

        $contribution = ManualContribution::create($validated);

        return response()->json($contribution->load(['member', 'creator']), 201);
    }

    public function show(ManualContribution $manualContribution)
    {
        return response()->json($manualContribution->load(['member', 'creator']));
    }

    public function update(Request $request, ManualContribution $manualContribution)
    {
        $validated = $request->validate([
            'member_id' => 'sometimes|required|exists:members,id',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'contribution_date' => 'sometimes|required|date',
            'payment_method' => 'nullable|string|in:cash,mpesa,bank_transfer,other',
            'notes' => 'nullable|string',
        ]);

        $manualContribution->update($validated);

        return response()->json($manualContribution->load(['member', 'creator']));
    }

    public function destroy(ManualContribution $manualContribution)
    {
        $manualContribution->delete();

        return response()->json(['message' => 'Manual contribution deleted successfully']);
    }
}

