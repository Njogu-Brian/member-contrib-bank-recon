<?php

namespace App\Services;

use App\Http\Controllers\ReportController;
use App\Models\Setting;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ReportExportService
{
    protected ReportController $reportController;

    public function __construct()
    {
        $this->reportController = app(ReportController::class);
    }

    /**
     * Generate report data
     */
    public function generateReport(string $type, array $filters = []): array
    {
        $request = new \Illuminate\Http\Request($filters);
        
        $response = match ($type) {
            'summary' => $this->reportController->summary($request),
            'contributions' => $this->reportController->contributions($request),
            'deposits' => $this->reportController->deposits($request),
            'expenses' => $this->reportController->expenses($request),
            'members' => $this->reportController->members($request),
            'transactions' => $this->reportController->transactions($request),
            default => throw new \Exception("Unknown report type: {$type}"),
        };
        
        // Extract JSON data from response
        $content = $response->getContent();
        return json_decode($content, true);
    }

    /**
     * Export report in specified format
     */
    public function exportReport(string $type, array $reportData, string $format): string
    {
        return match ($format) {
            'pdf' => $this->exportToPdf($type, $reportData),
            'excel' => $this->exportToExcel($type, $reportData),
            'csv' => $this->exportToCsv($type, $reportData),
            default => throw new \Exception("Unsupported format: {$format}"),
        };
    }

    /**
     * Export to PDF - Returns file path or binary content
     */
    protected function exportToPdf(string $type, array $reportData, bool $returnBinary = false)
    {
        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        
        $dompdf = new Dompdf($options);
        
        // Generate simple HTML report
        $html = $this->generateReportHtml($type, $reportData);

        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        $output = $dompdf->output();

        if ($returnBinary) {
            return $output;
        }

        $filename = "reports/{$type}-" . Str::uuid() . '.pdf';
        Storage::disk('public')->put($filename, $output);

        return $filename;
    }

    /**
     * Generate HTML for report (simple format without Blade templates)
     */
    protected function generateReportHtml(string $type, array $reportData): string
    {
        $appName = Setting::get('app_name', 'Evimeria System');
        $generatedAt = now()->format('Y-m-d H:i:s');
        
        $html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>{$appName} - " . ucfirst($type) . " Report</title>";
        $html .= "<style>body{font-family:Arial,sans-serif;margin:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;text-align:left;border:1px solid #ddd;}th{background-color:#f2f2f2;}</style>";
        $html .= "</head><body>";
        $html .= "<h1>{$appName}</h1>";
        $html .= "<h2>" . ucfirst($type) . " Report</h2>";
        $html .= "<p>Generated: {$generatedAt}</p>";

        switch ($type) {
            case 'summary':
                $html .= "<table><tr><th>Metric</th><th>Value</th></tr>";
                $html .= "<tr><td>Total Contributions</td><td>KES " . number_format($reportData['total_contributions'] ?? 0, 2) . "</td></tr>";
                $html .= "<tr><td>Total Expenses</td><td>KES " . number_format($reportData['total_expenses'] ?? 0, 2) . "</td></tr>";
                $html .= "<tr><td>Total Members</td><td>" . ($reportData['total_members'] ?? 0) . "</td></tr>";
                $html .= "</table>";
                break;

            case 'members':
                if (isset($reportData['members']) && count($reportData['members']) > 0) {
                    $html .= "<table><tr><th>Name</th><th>Phone</th><th>Total Contributions</th><th>Expected</th><th>Difference</th><th>Status</th></tr>";
                    foreach ($reportData['members'] as $member) {
                        $html .= "<tr>";
                        $html .= "<td>" . htmlspecialchars($member['name'] ?? '') . "</td>";
                        $html .= "<td>" . htmlspecialchars($member['phone'] ?? '') . "</td>";
                        $html .= "<td>KES " . number_format($member['total_contributions'] ?? 0, 2) . "</td>";
                        $html .= "<td>KES " . number_format($member['expected_contributions'] ?? 0, 2) . "</td>";
                        $html .= "<td>KES " . number_format($member['difference'] ?? 0, 2) . "</td>";
                        $html .= "<td>" . htmlspecialchars($member['status_label'] ?? '') . "</td>";
                        $html .= "</tr>";
                    }
                    $html .= "</table>";
                }
                break;

            case 'deposits':
                if (isset($reportData['recent']) && count($reportData['recent']) > 0) {
                    $html .= "<table><tr><th>Date</th><th>Member</th><th>Amount</th><th>Particulars</th></tr>";
                    foreach ($reportData['recent'] as $deposit) {
                        $html .= "<tr>";
                        $html .= "<td>" . htmlspecialchars($deposit['tran_date'] ?? '') . "</td>";
                        $html .= "<td>" . htmlspecialchars($deposit['member_name'] ?? 'Unassigned') . "</td>";
                        $html .= "<td>KES " . number_format($deposit['amount'] ?? 0, 2) . "</td>";
                        $html .= "<td>" . htmlspecialchars($deposit['particulars'] ?? '') . "</td>";
                        $html .= "</tr>";
                    }
                    $html .= "</table>";
                }
                break;

            case 'expenses':
                if (isset($reportData['recent']) && count($reportData['recent']) > 0) {
                    $html .= "<table><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>";
                    foreach ($reportData['recent'] as $expense) {
                        $html .= "<tr>";
                        $html .= "<td>" . htmlspecialchars($expense['expense_date'] ?? '') . "</td>";
                        $html .= "<td>" . htmlspecialchars($expense['description'] ?? '') . "</td>";
                        $html .= "<td>" . htmlspecialchars($expense['category'] ?? '') . "</td>";
                        $html .= "<td>KES " . number_format($expense['amount'] ?? 0, 2) . "</td>";
                        $html .= "</tr>";
                    }
                    $html .= "</table>";
                }
                break;

            default:
                $html .= "<p>Report data: " . json_encode($reportData, JSON_PRETTY_PRINT) . "</p>";
        }

        $html .= "</body></html>";
        return $html;
    }

    /**
     * Export to Excel
     */
    protected function exportToExcel(string $type, array $reportData): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $sheet->setCellValue('A1', Setting::get('app_name', 'Evimeria System'));
        $sheet->setCellValue('A2', ucfirst($type) . ' Report');
        $sheet->setCellValue('A3', 'Generated: ' . now()->format('Y-m-d H:i:s'));

        $row = 5;

        // Type-specific export logic
        switch ($type) {
            case 'summary':
                $sheet->setCellValue('A' . $row, 'Total Contributions');
                $sheet->setCellValue('B' . $row, $reportData['total_contributions'] ?? 0);
                $row++;
                $sheet->setCellValue('A' . $row, 'Total Expenses');
                $sheet->setCellValue('B' . $row, $reportData['total_expenses'] ?? 0);
                $row++;
                $sheet->setCellValue('A' . $row, 'Total Members');
                $sheet->setCellValue('B' . $row, $reportData['total_members'] ?? 0);
                break;

            case 'members':
                $sheet->setCellValue('A' . $row, 'Name');
                $sheet->setCellValue('B' . $row, 'Phone');
                $sheet->setCellValue('C' . $row, 'Total Contributions');
                $sheet->setCellValue('D' . $row, 'Expected');
                $sheet->setCellValue('E' . $row, 'Difference');
                $sheet->setCellValue('F' . $row, 'Status');
                $row++;

                foreach ($reportData['members'] ?? [] as $member) {
                    $sheet->setCellValue('A' . $row, $member['name'] ?? '');
                    $sheet->setCellValue('B' . $row, $member['phone'] ?? '');
                    $sheet->setCellValue('C' . $row, $member['total_contributions'] ?? 0);
                    $sheet->setCellValue('D' . $row, $member['expected_contributions'] ?? 0);
                    $sheet->setCellValue('E' . $row, $member['difference'] ?? 0);
                    $sheet->setCellValue('F' . $row, $member['status_label'] ?? '');
                    $row++;
                }
                break;

            case 'deposits':
                $sheet->setCellValue('A' . $row, 'Date');
                $sheet->setCellValue('B' . $row, 'Member');
                $sheet->setCellValue('C' . $row, 'Amount');
                $sheet->setCellValue('D' . $row, 'Particulars');
                $row++;

                foreach ($reportData['recent'] ?? [] as $deposit) {
                    $sheet->setCellValue('A' . $row, $deposit['tran_date'] ?? '');
                    $sheet->setCellValue('B' . $row, $deposit['member_name'] ?? 'Unassigned');
                    $sheet->setCellValue('C' . $row, $deposit['amount'] ?? 0);
                    $sheet->setCellValue('D' . $row, $deposit['particulars'] ?? '');
                    $row++;
                }
                break;

            case 'expenses':
                $sheet->setCellValue('A' . $row, 'Date');
                $sheet->setCellValue('B' . $row, 'Description');
                $sheet->setCellValue('C' . $row, 'Category');
                $sheet->setCellValue('D' . $row, 'Amount');
                $row++;

                foreach ($reportData['recent'] ?? [] as $expense) {
                    $sheet->setCellValue('A' . $row, $expense['expense_date'] ?? '');
                    $sheet->setCellValue('B' . $row, $expense['description'] ?? '');
                    $sheet->setCellValue('C' . $row, $expense['category'] ?? '');
                    $sheet->setCellValue('D' . $row, $expense['amount'] ?? 0);
                    $row++;
                }
                break;
        }

        // Auto-size columns
        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Style header row
        $sheet->getStyle('A5:F5')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E0E0E0'],
            ],
        ]);

        $filename = "reports/{$type}-" . Str::uuid() . '.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save(Storage::disk('public')->path($filename));

        return $filename;
    }

    /**
     * Export to CSV
     */
    protected function exportToCsv(string $type, array $reportData): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Similar to Excel but simpler
        $row = 1;

        switch ($type) {
            case 'members':
                $sheet->setCellValue('A' . $row, 'Name');
                $sheet->setCellValue('B' . $row, 'Phone');
                $sheet->setCellValue('C' . $row, 'Total Contributions');
                $sheet->setCellValue('D' . $row, 'Expected');
                $sheet->setCellValue('E' . $row, 'Difference');
                $row++;

                foreach ($reportData['members'] ?? [] as $member) {
                    $sheet->setCellValue('A' . $row, $member['name'] ?? '');
                    $sheet->setCellValue('B' . $row, $member['phone'] ?? '');
                    $sheet->setCellValue('C' . $row, $member['total_contributions'] ?? 0);
                    $sheet->setCellValue('D' . $row, $member['expected_contributions'] ?? 0);
                    $sheet->setCellValue('E' . $row, $member['difference'] ?? 0);
                    $row++;
                }
                break;

            default:
                // Basic CSV export
                $sheet->setCellValue('A1', json_encode($reportData));
        }

        $filename = "reports/{$type}-" . Str::uuid() . '.csv';
        $writer = new Csv($spreadsheet);
        $writer->save(Storage::disk('public')->path($filename));

        return $filename;
    }

    /**
     * Get logo URL
     */
    protected function getLogoUrl(): ?string
    {
        $logoPath = Setting::get('logo_path');
        if (!$logoPath) {
            return null;
        }

        return Storage::disk('public')->url($logoPath);
    }
}

