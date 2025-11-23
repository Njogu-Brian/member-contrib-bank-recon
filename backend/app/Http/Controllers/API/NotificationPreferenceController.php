<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notifications\NotificationPreferenceRequest;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function __construct(private readonly NotificationService $notificationService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->notificationService->preferences($request->user()));
    }

    public function update(NotificationPreferenceRequest $request): JsonResponse
    {
        $prefs = $this->notificationService->updatePreferences($request->user(), $request->validated());

        return response()->json($prefs);
    }

    public function log(Request $request): JsonResponse
    {
        return response()->json($this->notificationService->getLog($request->user()));
    }
}

