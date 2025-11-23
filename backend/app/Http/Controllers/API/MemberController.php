<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 20);
        $perPage = min(max($perPage, 5), 100);

        $members = Member::query()
            ->select([
                'id',
                'name',
                'email',
                'phone',
                'member_code',
                'member_number',
                'is_active',
                'date_of_registration',
                'created_at',
            ])
            ->withAppends([
                'contribution_status',
                'contribution_status_label',
                'contribution_status_color',
            ])
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $members->items(),
            'meta' => [
                'current_page' => $members->currentPage(),
                'per_page' => $members->perPage(),
                'last_page' => $members->lastPage(),
                'total' => $members->total(),
            ],
        ]);
    }

    public function show(Member $member): JsonResponse
    {
        $member->append([
            'contribution_status',
            'contribution_status_label',
            'contribution_status_color',
        ]);

        return response()->json([
            'data' => $member,
        ]);
    }
}

