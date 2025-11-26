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

    /**
     * Public announcements for login page (no auth required)
     * Returns only published announcements
     */
    public function publicList(): JsonResponse
    {
        // Get published announcements (published_at is null or in the past)
        $announcements = Announcement::where(function ($query) {
                // Only show announcements that are published (published_at is null or in the past)
                $query->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            })
            ->orderBy('is_pinned', 'desc') // Pinned announcements first
            ->orderBy('created_at', 'desc')
            ->limit(5) // Limit to recent 5 for login page
            ->get()
            ->map(function ($announcement) {
                return [
                    'id' => $announcement->id,
                    'title' => $announcement->title,
                    'content' => $announcement->body ?? '',
                    'created_at' => $announcement->created_at,
                    'is_pinned' => $announcement->is_pinned ?? false,
                ];
            });
        
        return response()->json($announcements);
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

