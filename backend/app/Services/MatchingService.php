<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MatchingService
{
    protected string $serviceUrl;

    public function __construct()
    {
        $this->serviceUrl = config('app.matching_service_url', 'http://localhost:3001');
    }

    public function matchBatch(array $transactions, array $members): array
    {
        try {
            $response = Http::timeout(60)->post("{$this->serviceUrl}/match-batch", [
                'transactions' => $transactions,
                'members' => $members,
            ]);

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            Log::warning('Matching service returned error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [];
        } catch (\Exception $e) {
            Log::error('Matching service request failed', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }
}

