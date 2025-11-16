<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MatchingService
{
    protected $baseUrl;

    public function __construct()
    {
        $this->baseUrl = env('MATCHING_SERVICE_URL', 'http://localhost:3001');
    }

    public function matchBatch(array $transactions, array $members): array
    {
        try {
            $response = Http::timeout(60)->post("{$this->baseUrl}/match-batch", [
                'transactions' => $transactions,
                'members' => $members,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning("Matching service returned error", [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [];
        } catch (\Exception $e) {
            Log::error("Matching service error", [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/health");
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }
}

