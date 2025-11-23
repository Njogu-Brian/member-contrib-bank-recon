<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Announcements\AnnouncementRequest;
use App\Models\Announcement;
use App\Services\AnnouncementService;
use Illuminate\Http\JsonResponse;

class AnnouncementController extends Controller
{
    public function __construct(private readonly AnnouncementService $announcementService)
    {
        $this->middleware('can:manage-announcements')->only(['store', 'update', 'destroy']);
    }

    public function index(): JsonResponse
    {
        return response()->json($this->announcementService->list());
    }

    public function store(AnnouncementRequest $request): JsonResponse
    {
        $announcement = $this->announcementService->create($request->validated(), $request->user()->id);

        return response()->json($announcement, 201);
    }

    public function update(AnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        $updated = $this->announcementService->update($announcement, $request->validated(), $request->user()->id);

        return response()->json($updated);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $this->announcementService->delete($announcement, auth()->id());

        return response()->json(['status' => 'deleted']);
    }
}

