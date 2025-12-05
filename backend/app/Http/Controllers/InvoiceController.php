<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Member;
use App\Models\Payment;
use App\Services\InvoicePaymentMatcher;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['member', 'payment']);

        if ($request->has('member_id') && $request->member_id !== '') {
            $query->where('member_id', $request->member_id);
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }
        
        // Invoice type filter
        if ($request->has('invoice_type') && $request->invoice_type !== '') {
            $query->where('invoice_type', $request->invoice_type);
        }

        if ($request->has('period') && $request->period !== '') {
            $query->where('period', $request->period);
        }
        
        // Month filter (Y-m format like 2024-11)
        if ($request->has('month') && $request->month !== '') {
            $query->whereRaw('DATE_FORMAT(issue_date, "%Y-%m") = ?', [$request->month]);
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
        
        // Sorting
        $sortBy = $request->get('sort_by', 'issue_date');
        $sortOrder = $request->get('sort_order', 'desc');
        
        // Validate sort column
        $allowedSortColumns = ['issue_date', 'due_date', 'invoice_number', 'amount', 'status'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'issue_date';
        }
        
        // Validate sort order
        $sortOrder = in_array($sortOrder, ['asc', 'desc']) ? $sortOrder : 'desc';

        return response()->json(
            $query->orderBy($sortBy, $sortOrder)
                ->paginate($request->get('per_page', 25))
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required_without:all_members|exists:members,id',
            'all_members' => 'boolean',
            'invoice_type_id' => 'nullable|exists:invoice_types,id',
            'invoice_type' => 'nullable|string',
            'amount' => 'required|numeric|min:0.01',
            'due_date' => 'required|date',
            'issue_date' => 'nullable|date',
            'period' => 'nullable|string|max:20',
            'description' => 'nullable|string',
        ]);

        $allMembers = $request->boolean('all_members', false);
        $invoiceTypeId = $validated['invoice_type_id'] ?? null;
        $invoiceTypeCode = $validated['invoice_type'] ?? null;

        // Get invoice type if provided
        $invoiceType = null;
        if ($invoiceTypeId) {
            $invoiceType = \App\Models\InvoiceType::find($invoiceTypeId);
        } elseif ($invoiceTypeCode) {
            $invoiceType = \App\Models\InvoiceType::where('code', $invoiceTypeCode)->first();
        }

        // If invoice type is "once" or "after_joining", check for duplicates
        if ($invoiceType && in_array($invoiceType->charge_type, [
            \App\Models\InvoiceType::CHARGE_ONCE,
            \App\Models\InvoiceType::CHARGE_AFTER_JOINING
        ])) {
            if ($allMembers) {
                // Bulk generation - return detailed results
                return $this->bulkCreateInvoices($validated, $invoiceType);
            } else {
                // Single member - check and throw error if exists
                $exists = Invoice::where('member_id', $validated['member_id'])
                    ->where(function ($query) use ($invoiceType) {
                        $query->where('invoice_type_id', $invoiceType->id)
                              ->orWhere('invoice_type', $invoiceType->code);
                    })
                    ->exists();

                if ($exists) {
                    return response()->json([
                        'message' => 'Invoice of this type has already been issued to this member. One-time invoices can only be issued once.',
                        'error' => 'duplicate_invoice',
                    ], 422);
                }
            }
        }

        if ($allMembers) {
            return $this->bulkCreateInvoices($validated, $invoiceType);
        }

        // Single invoice creation
        $member = \App\Models\Member::find($validated['member_id']);
        
        // For "after_joining" types, use member's registration date
        if ($invoiceType && $invoiceType->charge_type === \App\Models\InvoiceType::CHARGE_AFTER_JOINING) {
            if (!$member || !$member->date_of_registration) {
                return response()->json([
                    'message' => 'Member does not have a registration date. Cannot create invoice for this type.',
                    'error' => 'no_registration_date',
                ], 422);
            }
            $validated['issue_date'] = $member->date_of_registration;
        } else {
            $validated['issue_date'] = $validated['issue_date'] ?? now();
        }
        
        $validated['invoice_number'] = Invoice::generateInvoiceNumber($invoiceTypeCode ?? Invoice::TYPE_CUSTOM, \Carbon\Carbon::parse($validated['issue_date']));
        $validated['status'] = 'pending';
        if ($invoiceType) {
            $validated['invoice_type_id'] = $invoiceType->id;
            $validated['invoice_type'] = $invoiceType->code;
        }

        $invoice = Invoice::create($validated);
        $invoice->load('member');

        return response()->json($invoice, 201);
    }

    /**
     * Bulk create invoices for all members
     */
    protected function bulkCreateInvoices(array $validated, ?\App\Models\InvoiceType $invoiceType): \Illuminate\Http\JsonResponse
    {
        $members = \App\Models\Member::where('is_active', true)->get();
        $generated = 0;
        $skipped = 0;
        $errors = [];

        foreach ($members as $member) {
            // Check for duplicates if one-time type
            if ($invoiceType && in_array($invoiceType->charge_type, [
                \App\Models\InvoiceType::CHARGE_ONCE,
                \App\Models\InvoiceType::CHARGE_AFTER_JOINING
            ])) {
                $exists = Invoice::where('member_id', $member->id)
                    ->where(function ($query) use ($invoiceType) {
                        $query->where('invoice_type_id', $invoiceType->id)
                              ->orWhere('invoice_type', $invoiceType->code);
                    })
                    ->exists();

                if ($exists) {
                    $skipped++;
                    $errors[] = "{$member->name}: Invoice already issued (one-time type)";
                    continue;
                }
            }

            try {
                // For "after_joining" types, use member's registration date
                $issueDate = $validated['issue_date'] ?? now();
                if ($invoiceType && $invoiceType->charge_type === \App\Models\InvoiceType::CHARGE_AFTER_JOINING) {
                    if (!$member->date_of_registration) {
                        $skipped++;
                        $errors[] = "{$member->name}: No registration date found";
                        continue;
                    }
                    $issueDate = $member->date_of_registration;
                }
                
                $invoiceData = array_merge($validated, [
                    'member_id' => $member->id,
                    'invoice_number' => Invoice::generateInvoiceNumber($invoiceType ? $invoiceType->code : Invoice::TYPE_CUSTOM, \Carbon\Carbon::parse($issueDate)),
                    'issue_date' => $issueDate,
                    'status' => 'pending',
                ]);

                if ($invoiceType) {
                    $invoiceData['invoice_type_id'] = $invoiceType->id;
                    $invoiceData['invoice_type'] = $invoiceType->code;
                }

                Invoice::create($invoiceData);
                $generated++;
            } catch (\Exception $e) {
                $skipped++;
                $errors[] = "{$member->name}: " . $e->getMessage();
                \Illuminate\Support\Facades\Log::error("Error creating invoice for member {$member->id}: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => "Invoice generation complete. Generated: {$generated}, Skipped: {$skipped}",
            'generated' => $generated,
            'skipped' => $skipped,
            'errors' => $errors,
        ], 201);
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

    /**
     * Bulk match all payments to invoices
     */
    public function bulkMatch(InvoicePaymentMatcher $matcher)
    {
        $result = $matcher->bulkMatchPayments();

        return response()->json([
            'message' => 'Bulk matching completed',
            'result' => $result,
        ]);
    }

    /**
     * Get all members with their invoice totals
     */
    public function membersWithInvoices(Request $request)
    {
        $query = Member::where('is_active', true)
            ->withCount([
                'invoices as total_invoices_count',
                'invoices as paid_invoices_count' => function ($q) {
                    $q->where('status', 'paid');
                },
                'invoices as pending_invoices_count' => function ($q) {
                    $q->whereIn('status', ['pending', 'overdue']);
                },
            ])
            ->withSum([
                'invoices as total_invoices_amount',
                'invoices as paid_invoices_amount' => function ($q) {
                    $q->where('status', 'paid');
                },
                'invoices as pending_invoices_amount' => function ($q) {
                    $q->whereIn('status', ['pending', 'overdue']);
                },
            ], 'amount');

        // Search filter
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('member_code', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'total_invoices_amount');
        $sortOrder = $request->get('sort_order', 'desc');
        
        $allowedSortColumns = ['name', 'total_invoices_amount', 'total_invoices_count', 'pending_invoices_amount'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'total_invoices_amount';
        }
        
        $sortOrder = in_array($sortOrder, ['asc', 'desc']) ? $sortOrder : 'desc';

        return response()->json(
            $query->orderBy($sortBy, $sortOrder)
                ->paginate($request->get('per_page', 25))
        );
    }
}
