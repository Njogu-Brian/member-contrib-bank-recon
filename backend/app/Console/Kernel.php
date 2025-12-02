<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Process scheduled reports - check every hour for reports that need to run
        $schedule->call(function () {
            \App\Models\ScheduledReport::where('is_active', true)
                ->whereNotNull('next_run_at')
                ->where('next_run_at', '<=', now())
                ->chunk(10, function ($reports) {
                    foreach ($reports as $report) {
                        try {
                            \App\Jobs\GenerateScheduledReport::dispatch($report);
                        } catch (\Exception $e) {
                            \Log::error('Failed to dispatch scheduled report job', [
                                'report_id' => $report->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                });
        })->hourly();

        // Alternative: Use command if preferred
        // $schedule->command('reports:process-scheduled')->hourly();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

