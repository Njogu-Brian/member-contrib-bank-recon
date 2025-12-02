<?php

namespace App\Jobs;

use App\Models\ScheduledReport;
use App\Services\ReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateScheduledReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public ScheduledReport $scheduledReport
    ) {
    }

    public function handle(ReportService $reportService): void
    {
        try {
            $this->scheduledReport->update(['last_run_at' => now()]);

            // Generate report data based on type
            $reportData = $reportService->generateReport(
                $this->scheduledReport->report_type,
                $this->scheduledReport->report_params ?? []
            );

            // Generate exports in requested formats
            $exports = [];
            foreach ($this->scheduledReport->format ?? ['pdf'] as $format) {
                $exports[$format] = $reportService->exportReport(
                    $this->scheduledReport->report_type,
                    $reportData,
                    $format
                );
            }

            // Send to recipients
            foreach ($this->scheduledReport->recipients as $recipient) {
                \Illuminate\Support\Facades\Mail::to($recipient)->send(
                    new \App\Mail\ScheduledReportMail(
                        $this->scheduledReport,
                        $reportData,
                        $exports
                    )
                );
            }

            // Calculate next run date
            $this->scheduledReport->calculateNextRun();
            $this->scheduledReport->save();

            Log::info('Scheduled report generated and sent', [
                'report_id' => $this->scheduledReport->id,
                'type' => $this->scheduledReport->report_type,
                'recipients' => $this->scheduledReport->recipients,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate scheduled report', [
                'report_id' => $this->scheduledReport->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

