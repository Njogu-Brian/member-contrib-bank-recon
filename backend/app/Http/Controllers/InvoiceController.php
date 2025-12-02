<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Member;
use App\Models\Payment;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['member', 'payment']);

        if ($request->has('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('period')) {
            $query->where('period', $request->period);
        }

        if ($request->has('overdue_only') && $request->boolean('overdue_only')) {
            $query->where(function ($q) {
                $q->where('status', 'overdue')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'pending')
                         ->whereDate('due_date', '<', now());
                  });
            });
        }

        return response()->json(
            $query->orderBy('due_date', 'desc')
                ->paginate($request->get('per_page', 25))
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:members,id',
            'amount' => 'required|numeric|min:0.01',
            'due_date' => 'required|date',
            'issue_date' => 'nullable|date',
            'period' => 'nullable|string|max:20',
            'description' => 'nullable|string',
        ]);

        $validated['invoice_number'] = Invoice::generateInvoiceNumber();
        $validated['issue_date'] = $validated['issue_date'] ?? now();
        $validated['status'] = 'pending';

        $invoice = Invoice::create($validated);
        $invoice->load('member');

        return response()->json($invoice, 201);
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['member', 'payment']);
        return response()->json($invoice);
    }

    public function update(Request $request, Invoice $invoice)
    {
        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Cannot update a paid invoice'], 422);
        }

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0.01',
            'due_date' => 'sometimes|date',
            'description' => 'nullable|string',
        ]);

        $invoice->update($validated);
        $invoice->load('member');

        return response()->json($invoice);
    }

    public function destroy(Invoice $invoice)
    {
        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Cannot delete a paid invoice'], 422);
        }

        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted successfully']);
    }

    public function markAsPaid(Request $request, Invoice $invoice)
    {
        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Invoice is already paid'], 422);
        }

        $validated = $request->validate([
            'payment_id' => 'required|exists:payments,id',
        ]);

        $payment = Payment::findOrFail($validated['payment_id']);
        $invoice->markAsPaid($payment);

        return response()->json([
            'message' => 'Invoice marked as paid',
            'invoice' => $invoice->fresh(['member', 'payment']),
        ]);
    }

    public function cancel(Invoice $invoice)
    {
        if ($invoice->isPaid()) {
            return response()->json(['message' => 'Cannot cancel a paid invoice'], 422);
        }

        $invoice->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Invoice cancelled successfully',
            'invoice' => $invoice,
        ]);
    }
}
