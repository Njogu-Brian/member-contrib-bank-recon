<?php

namespace App\Http\Controllers;

use App\Models\ScheduledReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ScheduledReportController extends Controller
{
    /**
     * List scheduled reports
     */
    public function index(Request $request): JsonResponse
    {
        $query = ScheduledReport::with('createdBy')
            ->orderBy('created_at', 'desc');

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('report_type')) {
            $query->where('report_type', $request->report_type);
        }

        $reports = $query->paginate($request->get('per_page', 20));

        return response()->json($reports);
    }

    /**
     * Create a new scheduled report
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'report_type' => ['required', Rule::in(['summary', 'contributions', 'deposits', 'expenses', 'members', 'transactions'])],
            'frequency' => ['required', Rule::in(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])],
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'required|email',
            'format' => 'nullable|array|min:1',
            'format.*' => Rule::in(['pdf', 'excel', 'csv']),
            'filters' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $report = ScheduledReport::create([
            'name' => $validated['name'] ?? null,
            'report_type' => $validated['report_type'],
            'report_params' => $validated['filters'] ?? [],
            'frequency' => $validated['frequency'],
            'recipients' => $validated['recipients'],
            'format' => $validated['format'] ?? ['pdf'],
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => auth()->id(),
        ]);

        // Calculate next run date
        $report->calculateNextRun();
        $report->save();

        return response()->json($report->load('createdBy'), 201);
    }

    /**
     * Update a scheduled report
     */
    public function update(Request $request, ScheduledReport $scheduledReport): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'report_type' => [Rule::in(['summary', 'contributions', 'deposits', 'expenses', 'members', 'transactions'])],
            'frequency' => [Rule::in(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])],
            'recipients' => 'sometimes|array|min:1',
            'recipients.*' => 'required|email',
            'format' => 'nullable|array|min:1',
            'format.*' => Rule::in(['pdf', 'excel', 'csv']),
            'filters' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $updateData = array_filter([
            'name' => $validated['name'] ?? null,
            'report_type' => $validated['report_type'] ?? null,
            'report_params' => $validated['filters'] ?? null,
            'frequency' => $validated['frequency'] ?? null,
            'recipients' => $validated['recipients'] ?? null,
            'format' => $validated['format'] ?? null,
            'is_active' => $validated['is_active'] ?? null,
        ], fn($value) => $value !== null);

        $scheduledReport->update($updateData);

        // Recalculate next run if frequency changed
        if (isset($validated['frequency'])) {
            $scheduledReport->calculateNextRun();
            $scheduledReport->save();
        }

        return response()->json($scheduledReport->load('createdBy'));
    }

    /**
     * Delete a scheduled report
     */
    public function destroy(ScheduledReport $scheduledReport): JsonResponse
    {
        $scheduledReport->delete();

        return response()->json(['message' => 'Scheduled report deleted successfully']);
    }

    /**
     * Toggle active status
     */
    public function toggleStatus(ScheduledReport $scheduledReport): JsonResponse
    {
        $scheduledReport->is_active = !$scheduledReport->is_active;
        $scheduledReport->save();

        return response()->json($scheduledReport);
    }

    /**
     * Run scheduled report immediately (manual trigger)
     */
    public function runNow(ScheduledReport $scheduledReport): JsonResponse
    {
        // Dispatch job to generate and send report
        \App\Jobs\GenerateScheduledReport::dispatch($scheduledReport);

        return response()->json([
            'message' => 'Report generation queued',
            'report' => $scheduledReport,
        ]);
    }
}

