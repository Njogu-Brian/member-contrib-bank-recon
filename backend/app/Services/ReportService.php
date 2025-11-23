<?php

namespace App\Services;

use App\Models\ReportExport;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReportService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
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

        // Fake generation for now
        $filePath = "reports/{$type}-" . Str::uuid() . ".{$this->extensionForFormat($format)}";
        Storage::disk('public')->put($filePath, json_encode(['filters' => $filters]));

        $export->update([
            'file_path' => $filePath,
            'status' => 'ready',
        ]);

        $this->auditLogger->log($userId, 'report.generated', $export, ['type' => $type, 'format' => $format]);

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

