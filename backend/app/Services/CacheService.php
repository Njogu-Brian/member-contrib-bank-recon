<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CacheService
{
    /**
     * Cache duration in seconds
     */
    protected const CACHE_DURATION = 3600; // 1 hour
    protected const SHORT_CACHE_DURATION = 300; // 5 minutes

    /**
     * Get or remember cached data
     */
    public function remember(string $key, callable $callback, int $duration = null): mixed
    {
        $duration = $duration ?? self::CACHE_DURATION;

        return Cache::remember($key, $duration, function () use ($callback) {
            try {
                return $callback();
            } catch (\Exception $e) {
                Log::error('Cache callback failed', [
                    'key' => $key,
                    'error' => $e->getMessage(),
                ]);
                throw $e;
            }
        });
    }

    /**
     * Cache member statistics
     */
    public function getMemberStats(int $memberId, callable $callback): array
    {
        return $this->remember(
            "member_stats_{$memberId}",
            $callback,
            self::SHORT_CACHE_DURATION
        );
    }

    /**
     * Cache dashboard data
     */
    public function getDashboardData(callable $callback): array
    {
        return $this->remember(
            'dashboard_data',
            $callback,
            self::SHORT_CACHE_DURATION
        );
    }

    /**
     * Cache report data
     */
    public function getReportData(string $reportType, array $filters, callable $callback): array
    {
        $filterKey = md5(json_encode($filters));
        return $this->remember(
            "report_{$reportType}_{$filterKey}",
            $callback,
            self::CACHE_DURATION
        );
    }

    /**
     * Cache settings
     */
    public function getSettings(callable $callback): array
    {
        return $this->remember(
            'app_settings',
            $callback,
            self::CACHE_DURATION
        );
    }

    /**
     * Invalidate cache by pattern
     */
    public function forget(string $pattern): void
    {
        // Laravel cache doesn't support pattern deletion natively
        // This is a simplified version - in production, use Redis with SCAN
        Cache::forget($pattern);
    }

    /**
     * Clear all caches (use with caution)
     */
    public function clearAll(): void
    {
        Cache::flush();
    }

    /**
     * Invalidate member-related caches
     */
    public function invalidateMemberCache(?int $memberId = null): void
    {
        if ($memberId) {
            Cache::forget("member_stats_{$memberId}");
        }
        Cache::forget('dashboard_data');
        // Clear all report caches
        Cache::tags(['reports'])->flush();
    }

    /**
     * Invalidate report caches
     */
    public function invalidateReportCache(string $reportType = null): void
    {
        if ($reportType) {
            // Clear specific report type
            Cache::tags(["report_{$reportType}"])->flush();
        } else {
            // Clear all reports
            Cache::tags(['reports'])->flush();
        }
    }
}

