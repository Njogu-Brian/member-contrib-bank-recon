<?php

namespace App\Services;

use App\Models\ReportExport;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ReportService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ReportExportService $exportService
    ) {
    }

    /**
     * Generate report data
     */
    public function generateReport(string $type, array $filters = []): array
    {
        return $this->exportService->generateReport($type, $filters);
    }

    /**
     * Export report in specified format
     */
    public function exportReport(string $type, array $reportData, string $format): string
    {
        return $this->exportService->exportReport($type, $reportData, $format);
    }

    public function queueExport(int $userId, string $type, string $format, array $filters = []): ReportExport
    {
        $export = ReportExport::create([
            'user_id' => $userId,
            'type' => $type,
            'format' => $format,
            'filters' => $filters,
            'status' => 'processing',
        ]);

        try {
            // Generate report data
            $reportData = $this->generateReport($type, $filters);

            // Export to requested format
            $filePath = $this->exportReport($type, $reportData, $format);

            $export->update([
                'file_path' => $filePath,
                'status' => 'ready',
            ]);

            $this->auditLogger->log($userId, 'report.generated', $export, ['type' => $type, 'format' => $format]);
        } catch (\Exception $e) {
            Log::error('Report export failed', [
                'export_id' => $export->id,
                'error' => $e->getMessage(),
            ]);

            $export->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }

        return $export;
    }

    public function listExports(int $userId): Collection
    {
        return ReportExport::where('user_id', $userId)->latest()->limit(20)->get();
    }

    protected function extensionForFormat(string $format): string
    {
        return match ($format) {
            'pdf' => 'pdf',
            'csv' => 'csv',
            'excel' => 'xlsx',
            default => 'dat',
        };
    }
}

