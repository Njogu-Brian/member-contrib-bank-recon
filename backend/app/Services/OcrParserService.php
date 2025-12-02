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
        $this->scriptPath = base_path('../ocr-parser/parse_pdf.py');
    }

    public function parsePdf(string $pdfPath): array
    {
        try {
            $absolutePath = Storage::disk('statements')->path($pdfPath);
            
            if (!file_exists($absolutePath)) {
                throw new \Exception("PDF file not found: {$absolutePath}");
            }

            $outputPath = tempnam(sys_get_temp_dir(), 'ocr_output_') . '.json';
            $debugPath = $outputPath . '_debug.txt';

            // On Windows, we need to properly escape paths with spaces
            // Use escapeshellarg which handles Windows paths correctly
            $pythonCmd = escapeshellarg($this->pythonPath);
            $scriptCmd = escapeshellarg($this->scriptPath);
            $pdfCmd = escapeshellarg($absolutePath);
            $outputCmd = escapeshellarg($outputPath);
            
            // Construct command without extra quotes since escapeshellarg already adds them
            $command = "{$pythonCmd} {$scriptCmd} {$pdfCmd} --output {$outputCmd} 2>&1";

            Log::info("Executing OCR parser", [
                'command' => $command,
                'pdf_path' => $absolutePath,
            ]);

            $output = [];
            $returnVar = 0;
            exec($command, $output, $returnVar);

            $stderr = implode("\n", $output);
            
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

