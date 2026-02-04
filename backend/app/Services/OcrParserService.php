<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class OcrParserService
{
    protected $pythonPath;
    protected $scriptPath;

    public function __construct()
    {
        $this->pythonPath = env('PYTHON_PATH', 'python3');
        $scriptPath = base_path('../ocr-parser/parse_pdf.py');
        $this->scriptPath = is_file($scriptPath) ? realpath($scriptPath) : $scriptPath;
    }

    public function parsePdf(string $pdfPath): array
    {
        try {
            $absolutePath = realpath(Storage::disk('statements')->path($pdfPath)) ?: Storage::disk('statements')->path($pdfPath);

            if (!file_exists($absolutePath)) {
                throw new \Exception("PDF file not found: {$absolutePath}");
            }

            $outputPath = tempnam(sys_get_temp_dir(), 'ocr_output_') . '.json';
            $debugPath = $outputPath . '_debug.txt';

            // Use proc_open with array of arguments so paths with spaces are never split by the shell
            $descriptorspec = [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];
            $cmd = [
                $this->pythonPath,
                $this->scriptPath,
                $absolutePath,
                '--output',
                $outputPath,
            ];

            Log::info("Executing OCR parser", [
                'pdf_path' => $absolutePath,
            ]);

            $process = proc_open($cmd, $descriptorspec, $pipes);
            if (!is_resource($process)) {
                throw new \Exception('Failed to start OCR parser process');
            }
            fclose($pipes[0]);
            $stdout = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $returnVar = proc_close($process);

            $stderr = trim($stderr ?: $stdout ?: '');

            if ($returnVar !== 0) {
                Log::error("OCR parser failed", [
                    'return_code' => $returnVar,
                    'stderr' => $stderr,
                ]);
                throw new \Exception("OCR parser failed: {$stderr}");
            }

            if (!file_exists($outputPath)) {
                throw new \Exception("Output file not created: {$outputPath}");
            }

            $jsonContent = file_get_contents($outputPath);
            $transactions = json_decode($jsonContent, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception("Invalid JSON output: " . json_last_error_msg());
            }

            if (!is_array($transactions)) {
                $transactions = [];
            }

            // Clean up temp files
            @unlink($outputPath);
            @unlink($debugPath);

            Log::info("OCR parser completed", [
                'transactions_found' => count($transactions),
            ]);

            return $transactions;

        } catch (\Exception $e) {
            Log::error("OCR parser error", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}

