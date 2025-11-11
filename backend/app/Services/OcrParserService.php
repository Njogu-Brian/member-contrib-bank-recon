<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class OcrParserService
{
    protected string $tesseractPath;

    public function __construct()
    {
        $this->tesseractPath = config('app.tesseract_path', 'tesseract');
    }

    public function parsePdf(string $filePath): array
    {
        $ocrParserPath = base_path('../ocr-parser/parse_pdf.py');
        $outputPath = storage_path('app/temp_'.uniqid().'.json');

        if (!file_exists($ocrParserPath)) {
            throw new \Exception("OCR parser not found at: {$ocrParserPath}");
        }

        $process = new Process([
            'python',
            $ocrParserPath,
            $filePath,
            '--output',
            $outputPath,
        ]);

        $process->setTimeout(300);
        $process->run();

        if (!$process->isSuccessful()) {
            Log::error('OCR parsing failed', [
                'error' => $process->getErrorOutput(),
                'output' => $process->getOutput(),
            ]);
            throw new \Exception('OCR parsing failed: '.$process->getErrorOutput());
        }

        if (!file_exists($outputPath)) {
            throw new \Exception('OCR parser did not generate output file');
        }

        $content = file_get_contents($outputPath);
        $data = json_decode($content, true);

        // Cleanup
        @unlink($outputPath);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Invalid JSON from OCR parser: '.json_last_error_msg());
        }

        return $data ?? [];
    }
}

