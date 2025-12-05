<?php

namespace App\Http\Controllers;

use App\Models\InvoiceType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InvoiceTypeController extends Controller
{
    /**
     * Get all invoice types
     */
    public function index(Request $request)
    {
        try {
            $query = InvoiceType::query();

            if ($request->has('active_only') && $request->boolean('active_only')) {
                $query->where('is_active', true);
            }

            // Check if pagination is requested
            if ($request->has('page') || $request->has('per_page')) {
                $perPage = max(1, min(100, (int) $request->get('per_page', 25)));
                $types = $query->orderBy('sort_order')->orderBy('name')->paginate($perPage);
                return response()->json($types);
            }

            // Return all if no pagination requested
            $types = $query->orderBy('sort_order')->orderBy('name')->get();
            return response()->json($types);
        } catch (\Exception $e) {
            \Log::error('Error fetching invoice types: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Error fetching invoice types: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific invoice type
     */
    public function show(InvoiceType $invoiceType)
    {
        return response()->json($invoiceType);
    }

    /**
     * Create a new invoice type
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:invoice_types,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'charge_type' => 'required|string|in:once,yearly,monthly,weekly,after_joining,custom',
            'charge_interval_days' => 'nullable|integer|min:1',
            'default_amount' => 'required|numeric|min:0',
            'due_days' => 'required|integer|min:1|max:365',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array',
            'sort_order' => 'nullable|integer',
        ]);

        $invoiceType = InvoiceType::create($validated);

        return response()->json($invoiceType, 201);
    }

    /**
     * Update an invoice type
     */
    public function update(Request $request, InvoiceType $invoiceType)
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|max:50|unique:invoice_types,code,' . $invoiceType->id,
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'charge_type' => 'sometimes|string|in:once,yearly,monthly,weekly,after_joining,custom',
            'charge_interval_days' => 'nullable|integer|min:1',
            'default_amount' => 'sometimes|numeric|min:0',
            'due_days' => 'sometimes|integer|min:1|max:365',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array',
            'sort_order' => 'nullable|integer',
        ]);

        $invoiceType->update($validated);

        return response()->json($invoiceType);
    }

    /**
     * Delete an invoice type
     */
    public function destroy(InvoiceType $invoiceType)
    {
        try {
            // Check if there are invoices using this type (only if column exists)
            try {
                $invoiceCount = \DB::table('invoices')
                    ->where('invoice_type_id', $invoiceType->id)
                    ->orWhere('invoice_type', $invoiceType->code)
                    ->count();
                    
                if ($invoiceCount > 0) {
                    return response()->json([
                        'message' => "Cannot delete invoice type. {$invoiceCount} invoice(s) are using this type.",
                    ], 422);
                }
            } catch (\Exception $e) {
                // Column might not exist, try alternative check
                $invoiceCount = \DB::table('invoices')
                    ->where('invoice_type', $invoiceType->code)
                    ->count();
                    
                if ($invoiceCount > 0) {
                    return response()->json([
                        'message' => "Cannot delete invoice type. {$invoiceCount} invoice(s) are using this type.",
                    ], 422);
                }
            }

            $invoiceType->delete();

            return response()->json(['message' => 'Invoice type deleted successfully']);
        } catch (\Exception $e) {
            \Log::error('Error deleting invoice type: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Error deleting invoice type: ' . $e->getMessage()
            ], 500);
        }
    }
}

