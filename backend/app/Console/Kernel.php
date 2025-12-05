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
        // Generate weekly invoices every Monday at 00:00
        $schedule->command('invoices:generate-weekly')
            ->weeklyOn(1, '00:00')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('Weekly invoices generated successfully');
            })
            ->onFailure(function () {
                \Log::error('Failed to generate weekly invoices');
            });

        // Generate scheduled invoices (yearly, monthly, after_joining, once) daily at 01:00
        $schedule->command('invoices:generate-scheduled')
            ->dailyAt('01:00')
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('Scheduled invoices generated successfully');
            })
            ->onFailure(function () {
                \Log::error('Failed to generate scheduled invoices');
            });

        // Send invoice reminders (time and frequency configured in settings)
        // Note: Command itself checks frequency, we run it daily and let it decide
        $reminderTime = \App\Models\Setting::get('invoice_reminder_time', '09:00');
        $schedule->command('invoices:send-reminders')
            ->dailyAt($reminderTime)
            ->withoutOverlapping()
            ->onSuccess(function () {
                \Log::info('Invoice reminders processed successfully');
            })
            ->onFailure(function () {
                \Log::error('Failed to process invoice reminders');
            });

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

