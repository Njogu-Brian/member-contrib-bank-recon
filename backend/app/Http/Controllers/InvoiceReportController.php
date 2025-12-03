<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceReportController extends Controller
{
    /**
     * Get outstanding invoices report
     */
    public function outstandingInvoices(Request $request)
    {
        $query = Invoice::with('member')
            ->whereIn('status', ['pending', 'overdue']);

        if ($request->has('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        $invoices = $query->orderBy('due_date', 'asc')->get();

        $summary = [
            'total_outstanding' => $invoices->sum('amount'),
            'total_pending' => $invoices->where('status', 'pending')->sum('amount'),
            'total_overdue' => $invoices->where('status', 'overdue')->sum('amount'),
            'count_pending' => $invoices->where('status', 'pending')->count(),
            'count_overdue' => $invoices->where('status', 'overdue')->count(),
        ];

        return response()->json([
            'invoices' => $invoices,
            'summary' => $summary,
        ]);
    }

    /**
     * Get payment collection report
     */
    public function paymentCollection(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth()->toDateString());

        $invoices = Invoice::whereBetween('paid_at', [$startDate, $endDate])
            ->where('status', 'paid')
            ->with('member')
            ->get();

        $summary = [
            'total_collected' => $invoices->sum('amount'),
            'total_invoices_paid' => $invoices->count(),
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ];

        // Group by week
        $weeklyCollection = $invoices->groupBy(function ($invoice) {
            return Carbon::parse($invoice->paid_at)->format('Y-\WW');
        })->map(function ($weekInvoices, $week) {
            return [
                'week' => $week,
                'amount' => $weekInvoices->sum('amount'),
                'count' => $weekInvoices->count(),
            ];
        })->values();

        return response()->json([
            'summary' => $summary,
            'weekly_collection' => $weeklyCollection,
            'invoices' => $invoices,
        ]);
    }

    /**
     * Get member compliance report
     */
    public function memberCompliance(Request $request)
    {
        $members = Member::where('is_active', true)->get();

        $report = $members->map(function ($member) {
            $totalInvoices = $member->invoices()->count();
            $paidInvoices = $member->invoices()->where('status', 'paid')->count();
            $pendingInvoices = $member->invoices()->whereIn('status', ['pending', 'overdue'])->count();
            $overdueInvoices = $member->invoices()->where('status', 'overdue')->count();
            $totalOutstanding = $member->invoices()->whereIn('status', ['pending', 'overdue'])->sum('amount');

            $complianceRate = $totalInvoices > 0 ? ($paidInvoices / $totalInvoices) * 100 : 0;

            return [
                'member_id' => $member->id,
                'member_name' => $member->name,
                'member_code' => $member->member_code,
                'total_invoices' => $totalInvoices,
                'paid_invoices' => $paidInvoices,
                'pending_invoices' => $pendingInvoices,
                'overdue_invoices' => $overdueInvoices,
                'total_outstanding' => $totalOutstanding,
                'compliance_rate' => round($complianceRate, 2),
                'status' => $overdueInvoices > 0 ? 'overdue' : ($pendingInvoices > 0 ? 'pending' : 'compliant'),
            ];
        });

        // Sort by compliance rate
        $sorted = $report->sortBy('compliance_rate');

        $summary = [
            'total_members' => $members->count(),
            'compliant_members' => $report->where('status', 'compliant')->count(),
            'members_with_overdue' => $report->where('status', 'overdue')->count(),
            'average_compliance_rate' => round($report->avg('compliance_rate'), 2),
            'total_outstanding_all_members' => $report->sum('total_outstanding'),
        ];

        return response()->json([
            'summary' => $summary,
            'members' => $sorted->values(),
        ]);
    }

    /**
     * Get weekly summary report
     */
    public function weeklySummary(Request $request)
    {
        $weeks = $request->get('weeks', 12); // Last 12 weeks by default

        $data = [];
        for ($i = 0; $i < $weeks; $i++) {
            $weekStart = Carbon::now()->subWeeks($i)->startOfWeek();
            $weekEnd = Carbon::now()->subWeeks($i)->endOfWeek();
            $weekNumber = $weekStart->format('Y-\WW');

            $issued = Invoice::where('period', $weekNumber)->sum('amount');
            $issuedCount = Invoice::where('period', $weekNumber)->count();
            
            $paid = Invoice::where('period', $weekNumber)
                ->where('status', 'paid')
                ->sum('amount');
            $paidCount = Invoice::where('period', $weekNumber)
                ->where('status', 'paid')
                ->count();

            $data[] = [
                'week' => $weekNumber,
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
                'issued_amount' => $issued,
                'issued_count' => $issuedCount,
                'paid_amount' => $paid,
                'paid_count' => $paidCount,
                'outstanding_amount' => $issued - $paid,
                'collection_rate' => $issued > 0 ? round(($paid / $issued) * 100, 2) : 0,
            ];
        }

        return response()->json([
            'weeks' => array_reverse($data),
        ]);
    }
}
