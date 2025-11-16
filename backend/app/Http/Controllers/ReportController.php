<?php

namespace App\Http\Controllers;

use App\Models\ContributionStatusRule;
use App\Models\Expense;
use App\Models\ManualContribution;
use App\Models\Member;
use App\Models\Setting;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');
        
        // Total contributions
        $totalContributions = Transaction::where('assignment_status', '!=', 'unassigned')
            ->where('is_archived', false)
            ->when($startDate, fn($q) => $q->where('tran_date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('tran_date', '<=', $endDate))
            ->sum('credit');
        
        $totalManual = ManualContribution::query()
            ->when($startDate, fn($q) => $q->where('contribution_date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('contribution_date', '<=', $endDate))
            ->sum('amount');
        
        // Transaction status counts
        $transactionStats = Transaction::query()
            ->where('is_archived', false)
            ->when($startDate, fn($q) => $q->where('tran_date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('tran_date', '<=', $endDate))
            ->selectRaw('assignment_status, COUNT(*) as count')
            ->groupBy('assignment_status')
            ->pluck('count', 'assignment_status');
        
        // Member performance
        $members = Member::where('is_active', true)->get();
        $rules = ContributionStatusRule::cached();
        $totalMembers = $members->count();
        $statusCounts = $rules->mapWithKeys(fn ($rule) => [
            $rule->slug => [
                'slug' => $rule->slug,
                'name' => $rule->name,
                'color' => $rule->color,
                'count' => 0,
                'percentage' => 0,
            ],
        ])->all();

        foreach ($members as $member) {
            $slug = $member->contribution_status;
            if ($slug && isset($statusCounts[$slug])) {
                $statusCounts[$slug]['count']++;
            }
        }

        $statusCounts = collect($statusCounts)->map(function ($entry) use ($totalMembers) {
            $entry['percentage'] = $totalMembers > 0
                ? round(($entry['count'] / $totalMembers) * 100, 1)
                : 0;
            return $entry;
        });

        $performance = $statusCounts->mapWithKeys(fn ($entry) => [$entry['slug'] => $entry['count']])->all();
        
        // Total expenses
        $totalExpenses = Expense::query()
            ->when($startDate, fn($q) => $q->where('expense_date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('expense_date', '<=', $endDate))
            ->sum('amount');
        
        return response()->json([
            'total_contributions' => $totalContributions + $totalManual,
            'total_transactions' => $totalContributions,
            'total_manual' => $totalManual,
            'total_expenses' => $totalExpenses,
            'transaction_stats' => $transactionStats,
            'member_performance' => $performance,
            'status_counts' => [
                'total' => $totalMembers,
                'statuses' => array_values($statusCounts->all()),
            ],
            'total_members' => $members->count(),
        ]);
    }

    public function contributions(Request $request)
    {
        $period = $request->get('period', 'weekly'); // weekly, monthly, yearly
        
        $query = Transaction::where('assignment_status', '!=', 'unassigned')
            ->where('is_archived', false)
            ->selectRaw('DATE(tran_date) as date, SUM(credit) as total');
        
        if ($period === 'weekly') {
            $query->selectRaw('YEAR(tran_date) as year, WEEK(tran_date) as week')
                  ->groupBy('year', 'week')
                  ->orderBy('year', 'desc')
                  ->orderBy('week', 'desc');
        } elseif ($period === 'monthly') {
            $query->selectRaw('YEAR(tran_date) as year, MONTH(tran_date) as month')
                  ->groupBy('year', 'month')
                  ->orderBy('year', 'desc')
                  ->orderBy('month', 'desc');
        } elseif ($period === 'yearly') {
            $query->selectRaw('YEAR(tran_date) as year')
                  ->groupBy('year')
                  ->orderBy('year', 'desc');
        }
        
        $results = $query->get();
        
        return response()->json([
            'period' => $period,
            'data' => $results,
        ]);
    }

    public function deposits(Request $request)
    {
        $baseQuery = Transaction::where('assignment_status', '!=', 'unassigned')
            ->where('is_archived', false);

        $now = Carbon::now();

        $totals = [
            'today' => (clone $baseQuery)->whereDate('tran_date', $now->toDateString())->sum('credit'),
            'this_week' => (clone $baseQuery)->whereBetween('tran_date', [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()])->sum('credit'),
            'this_month' => (clone $baseQuery)->whereBetween('tran_date', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()])->sum('credit'),
            'this_year' => (clone $baseQuery)->whereBetween('tran_date', [$now->copy()->startOfYear(), $now->copy()->endOfYear()])->sum('credit'),
            'all_time' => (clone $baseQuery)->sum('credit'),
        ];

        $monthly = (clone $baseQuery)
            ->where('tran_date', '>=', $now->copy()->subMonths(11)->startOfMonth())
            ->selectRaw('DATE_FORMAT(tran_date, "%Y-%m") as label, SUM(credit) as total')
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn($row) => [
                'label' => $row->label,
                'total' => (float) $row->total,
            ])
            ->values();

        $weekly = (clone $baseQuery)
            ->where('tran_date', '>=', $now->copy()->subWeeks(11)->startOfWeek())
            ->selectRaw('CONCAT(YEAR(tran_date), "-W", LPAD(WEEK(tran_date, 1), 2, "0")) as label, SUM(credit) as total')
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn($row) => [
                'label' => $row->label,
                'total' => (float) $row->total,
            ])
            ->values();

        $yearly = (clone $baseQuery)
            ->where('tran_date', '>=', $now->copy()->subYears(4)->startOfYear())
            ->selectRaw('YEAR(tran_date) as label, SUM(credit) as total')
            ->groupBy(DB::raw('YEAR(tran_date)'))
            ->orderBy(DB::raw('YEAR(tran_date)'))
            ->get()
            ->map(fn($row) => [
                'label' => (string) $row->label,
                'total' => (float) $row->total,
            ])
            ->values();

        $topMembers = (clone $baseQuery)
            ->whereNotNull('member_id')
            ->select('member_id', DB::raw('SUM(credit) as total'))
            ->groupBy('member_id')
            ->with('member:id,name')
            ->orderByDesc('total')
            ->take(5)
            ->get()
            ->map(fn($row) => [
                'member_id' => $row->member_id,
                'member_name' => $row->member->name ?? 'Unknown',
                'total' => (float) $row->total,
            ]);

        $recent = (clone $baseQuery)
            ->with('member:id,name')
            ->orderBy('tran_date', 'desc')
            ->take(10)
            ->get(['id', 'member_id', 'tran_date', 'particulars', 'credit'])
            ->map(fn($row) => [
                'id' => $row->id,
                'member_name' => $row->member->name ?? null,
                'tran_date' => $row->tran_date,
                'particulars' => $row->particulars,
                'amount' => (float) $row->credit,
            ]);

        return response()->json([
            'totals' => $totals,
            'breakdowns' => [
                'monthly' => $monthly,
                'weekly' => $weekly,
                'yearly' => $yearly,
            ],
            'top_members' => $topMembers,
            'recent' => $recent,
        ]);
    }

    public function expenses(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');
        $categoryFilter = $request->get('category');

        $baseQuery = Expense::query()
            ->when($startDate, fn($q) => $q->where('expense_date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('expense_date', '<=', $endDate))
            ->when($categoryFilter, fn($q) => $q->where('category', $categoryFilter));

        $total = (clone $baseQuery)->sum('amount');

        $categories = (clone $baseQuery)
            ->selectRaw('COALESCE(category, "Uncategorized") as category, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(fn($row) => [
                'category' => $row->category,
                'total' => (float) $row->total,
                'count' => (int) $row->count,
            ]);

        $monthly = (clone $baseQuery)
            ->where('expense_date', '>=', Carbon::now()->subMonths(11)->startOfMonth())
            ->selectRaw('DATE_FORMAT(expense_date, "%Y-%m") as label, SUM(amount) as total')
            ->groupBy('label')
            ->orderBy('label')
            ->get()
            ->map(fn($row) => [
                'label' => $row->label,
                'total' => (float) $row->total,
            ])
            ->values();

        $recent = (clone $baseQuery)
            ->orderBy('expense_date', 'desc')
            ->take(10)
            ->get(['id', 'description', 'category', 'amount', 'expense_date'])
            ->map(fn($row) => [
                'id' => $row->id,
                'description' => $row->description,
                'category' => $row->category ?? 'Uncategorized',
                'amount' => (float) $row->amount,
                'expense_date' => $row->expense_date,
            ]);

        return response()->json([
            'total' => $total,
            'categories' => $categories,
            'monthly' => $monthly,
            'recent' => $recent,
        ]);
    }

    public function members(Request $request)
    {
        $status = $request->get('status'); // on_track, behind, deficit, ahead
        
        $members = Member::where('is_active', true)->get();
        $rules = ContributionStatusRule::cached();
        $statusMap = $rules->keyBy('slug');

        $allData = $members->map(function($member) use ($statusMap) {
            $slug = $member->contribution_status;
            $meta = $statusMap->get($slug);

            return [
                'id' => $member->id,
                'name' => $member->name,
                'phone' => $member->phone,
                'total_contributions' => $member->total_contributions,
                'expected_contributions' => $member->expected_contributions,
                'contribution_status' => $slug,
                'status_label' => $meta->name ?? ucfirst(str_replace('_', ' ', $slug ?? 'unknown')),
                'status_color' => $meta->color ?? '#6b7280',
                'difference' => $member->total_contributions - $member->expected_contributions,
            ];
        });
        
        $filtered = $allData;
        if ($status) {
            $filtered = $filtered->filter(fn($m) => $m['contribution_status'] === $status);
        }

        $statusCounts = $rules->mapWithKeys(fn ($rule) => [
            $rule->slug => [
                'slug' => $rule->slug,
                'name' => $rule->name,
                'color' => $rule->color,
                'count' => 0,
                'percentage' => 0,
            ],
        ])->all();

        $totalMembers = $allData->count();

        foreach ($allData as $row) {
            $slug = $row['contribution_status'];
            if ($slug && isset($statusCounts[$slug])) {
                $statusCounts[$slug]['count']++;
            }
        }

        $statusCounts = collect($statusCounts)->map(function ($entry) use ($totalMembers) {
            $entry['percentage'] = $totalMembers > 0
                ? round(($entry['count'] / $totalMembers) * 100, 1)
                : 0;
            return $entry;
        });

        $summary = [
            'total' => $totalMembers,
            'statuses' => array_values($statusCounts->all()),
            'counts' => $statusCounts->mapWithKeys(fn ($entry) => [$entry['slug'] => $entry['count']])->all(),
        ];
        
        return response()->json([
            'members' => $filtered->values(),
            'summary' => $summary,
            'available_statuses' => array_values($rules->map(fn ($rule) => [
                'slug' => $rule->slug,
                'name' => $rule->name,
                'color' => $rule->color,
            ])->all()),
            'filtered_total' => $filtered->count(),
        ]);
    }

    public function transactions(Request $request)
    {
        $status = $request->get('status');
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');
        
        $query = Transaction::with('member');

        if ($request->filled('archived')) {
            $archived = filter_var($request->archived, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($archived !== null) {
                $query->where('is_archived', $archived);
            }
        } else {
            $query->where('is_archived', false);
        }
        
        if ($status) {
            $query->where('assignment_status', $status);
        }
        
        if ($startDate) {
            $query->where('tran_date', '>=', $startDate);
        }
        
        if ($endDate) {
            $query->where('tran_date', '<=', $endDate);
        }
        
        return response()->json($query->orderBy('tran_date', 'desc')->paginate($request->get('per_page', 50)));
    }
}

