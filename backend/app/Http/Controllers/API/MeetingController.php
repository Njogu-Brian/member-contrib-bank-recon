<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Meetings\MeetingRequest;
use App\Http\Requests\Meetings\MotionRequest;
use App\Http\Requests\Meetings\VoteRequest;
use App\Models\Meeting;
use App\Models\Motion;
use App\Services\MeetingService;
use Illuminate\Http\JsonResponse;

class MeetingController extends Controller
{
    public function __construct(private readonly MeetingService $meetingService)
    {
        $this->middleware('can:manage-meetings')->only(['store', 'addMotion']);
    }

    public function index(): JsonResponse
    {
        return response()->json($this->meetingService->list());
    }

    public function store(MeetingRequest $request): JsonResponse
    {
        $meeting = $this->meetingService->create($request->validated(), $request->user()->id);

        return response()->json($meeting, 201);
    }

    public function addMotion(Meeting $meeting, MotionRequest $request): JsonResponse
    {
        $motion = $this->meetingService->addMotion($meeting, $request->validated(), $request->user()->id);

        return response()->json($motion, 201);
    }

    public function vote(Motion $motion, VoteRequest $request): JsonResponse
    {
        $vote = $this->meetingService->castVote($motion, $request->user()->id, $request->validated()['choice']);

        return response()->json($vote);
    }

    /**
     * Mobile: Get meetings for authenticated user
     */
    public function mobileIndex(): JsonResponse
    {
        $meetings = $this->meetingService->list();
        return response()->json(['data' => $meetings]);
    }

    /**
     * Mobile: Vote on motion
     */
    public function mobileVote(Request $request, Motion $motion): JsonResponse
    {
        $validated = $request->validate([
            'choice' => 'required|string|in:yes,no,abstain',
        ]);

        $vote = $this->meetingService->castVote($motion, $request->user()->id, $validated['choice']);

        return response()->json([
            'message' => 'Vote cast successfully',
            'vote' => $vote,
        ]);
    }
}

