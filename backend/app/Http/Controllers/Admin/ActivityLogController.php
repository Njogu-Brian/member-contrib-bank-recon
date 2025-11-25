<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with(['user']);

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('model_type')) {
            $query->where('model_type', $request->model_type);
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 50);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
        ]);
    }

    public function show(ActivityLog $activityLog)
    {
        $activityLog->load(['user', 'model']);
        return response()->json(['data' => $activityLog]);
    }

    public function statistics(Request $request)
    {
        $query = ActivityLog::query();

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $baseQuery = clone $query;
        
        $stats = [
            'total' => $baseQuery->count(),
            'by_action' => (clone $query)->select('action', DB::raw('count(*) as count'))
                ->groupBy('action')
                ->pluck('count', 'action'),
            'by_user' => (clone $query)->select('user_id', DB::raw('count(*) as count'))
                ->whereNotNull('user_id')
                ->groupBy('user_id')
                ->get()
                ->map(function ($item) {
                    try {
                        $user = \App\Models\User::find($item->user_id);
                        return [
                            'user_id' => $item->user_id,
                            'user_name' => $user ? $user->name : 'Unknown',
                            'count' => $item->count,
                        ];
                    } catch (\Exception $e) {
                        return [
                            'user_id' => $item->user_id,
                            'user_name' => 'Unknown',
                            'count' => $item->count,
                        ];
                    }
                }),
            'today' => (clone $query)->whereDate('created_at', today())->count(),
            'this_week' => (clone $query)->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'this_month' => (clone $query)->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->count(),
        ];

        return response()->json($stats);
    }
}

