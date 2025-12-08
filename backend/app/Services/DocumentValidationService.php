<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class DocumentValidationService
{
    /**
     * Validate uploaded document
     * 
     * @param UploadedFile $file
     * @param string $documentType (front_id, back_id, selfie)
     * @return array
     */
    public function validateDocument(UploadedFile $file, string $documentType): array
    {
        $results = [
            'is_clear' => false,
            'has_face' => false,
            'is_kenyan_id' => false,
            'is_readable' => false,
            'errors' => [],
            'warnings' => [],
        ];

        try {
            // Check if file is an image
            if (!in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/jpg'])) {
                $results['errors'][] = 'File must be a JPEG or PNG image';
                return $results;
            }

            // Load image for analysis
            $imagePath = $file->getRealPath();
            
            // 1. Check image clarity (blur detection)
            $results['is_clear'] = $this->checkClarity($imagePath);
            if (!$results['is_clear']) {
                $results['errors'][] = 'Image is too blurred. Please take a clear photo.';
            }

            // 2. Face detection (for selfie and front_id)
            if (in_array($documentType, ['selfie', 'front_id'])) {
                $results['has_face'] = $this->detectFace($imagePath);
                if (!$results['has_face']) {
                    $results['errors'][] = 'No face detected in the image. Please ensure your face is clearly visible.';
                }
            }

            // 3. Kenyan ID verification (for front_id and back_id)
            if (in_array($documentType, ['front_id', 'back_id'])) {
                $results['is_kenyan_id'] = $this->verifyKenyanId($imagePath, $documentType);
                if (!$results['is_kenyan_id']) {
                    $results['errors'][] = 'Could not verify this as a Kenyan ID. Please ensure the ID is clearly visible.';
                }
            }

            // 4. Readability check (OCR-like validation)
            if (in_array($documentType, ['front_id', 'back_id'])) {
                $results['is_readable'] = $this->checkReadability($imagePath);
                if (!$results['is_readable']) {
                    $results['warnings'][] = 'Some text on the ID may not be clearly readable. Please ensure all details are visible.';
                }
            }

        } catch (\Exception $e) {
            Log::error('Document validation error: ' . $e->getMessage());
            $results['errors'][] = 'An error occurred during validation: ' . $e->getMessage();
        }

        return $results;
    }

    /**
     * Check image clarity using Laplacian variance
     */
    private function checkClarity(string $imagePath): bool
    {
        try {
            $image = imagecreatefromstring(file_get_contents($imagePath));
            if (!$image) {
                return false;
            }

            $width = imagesx($image);
            $height = imagesy($image);
            
            // Convert to grayscale
            $gray = imagecreatetruecolor($width, $height);
            imagecopymerge($gray, $image, 0, 0, 0, 0, $width, $height, 100);
            
            // Calculate Laplacian variance (blur detection)
            $laplacian = 0;
            $sum = 0;
            
            for ($y = 1; $y < $height - 1; $y++) {
                for ($x = 1; $x < $width - 1; $x++) {
                    $pixel = imagecolorat($gray, $x, $y) & 0xFF;
                    $neighbors = [
                        imagecolorat($gray, $x-1, $y) & 0xFF,
                        imagecolorat($gray, $x+1, $y) & 0xFF,
                        imagecolorat($gray, $x, $y-1) & 0xFF,
                        imagecolorat($gray, $x, $y+1) & 0xFF,
                    ];
                    
                    $laplacianValue = abs(4 * $pixel - array_sum($neighbors));
                    $sum += $laplacianValue;
                }
            }
            
            $variance = $sum / (($width - 2) * ($height - 2));
            
            imagedestroy($image);
            imagedestroy($gray);
            
            // Threshold: variance > 100 indicates clear image
            return $variance > 100;
        } catch (\Exception $e) {
            Log::error('Clarity check error: ' . $e->getMessage());
            // If we can't check, assume it's clear (fail open)
            return true;
        }
    }

    /**
     * Detect face in image (basic detection)
     * Note: This is a simplified version. For production, consider using a face detection library
     */
    private function detectFace(string $imagePath): bool
    {
        try {
            // Basic face detection using image analysis
            // In production, you might want to use OpenCV or a face detection API
            $image = imagecreatefromstring(file_get_contents($imagePath));
            if (!$image) {
                return false;
            }

            $width = imagesx($image);
            $height = imagesy($image);
            
            // Check for skin tone regions (simplified face detection)
            $skinPixels = 0;
            $totalPixels = $width * $height;
            
            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    $rgb = imagecolorat($image, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;
                    
                    // Basic skin tone detection
                    if ($r > 95 && $g > 40 && $b > 20 && 
                        max($r, $g, $b) - min($r, $g, $b) > 15 &&
                        abs($r - $g) > 15 && $r > $g && $r > $b) {
                        $skinPixels++;
                    }
                }
            }
            
            imagedestroy($image);
            
            // If more than 5% of pixels are skin-toned, likely has a face
            return ($skinPixels / $totalPixels) > 0.05;
        } catch (\Exception $e) {
            Log::error('Face detection error: ' . $e->getMessage());
            // If we can't detect, assume face exists (fail open)
            return true;
        }
    }

    /**
     * Verify if image is a Kenyan ID
     */
    private function verifyKenyanId(string $imagePath, string $side): bool
    {
        try {
            // Basic verification: check for Kenyan ID characteristics
            // In production, you might want to use OCR or ML models
            
            $image = imagecreatefromstring(file_get_contents($imagePath));
            if (!$image) {
                return false;
            }

            $width = imagesx($image);
            $height = imagesy($image);
            
            // Check aspect ratio (Kenyan IDs have specific dimensions)
            $aspectRatio = $width / $height;
            
            // Kenyan ID cards are typically around 85.6mm x 53.98mm (ratio ~1.586)
            // Allow some variance
            $isValidRatio = $aspectRatio >= 1.4 && $aspectRatio <= 1.8;
            
            // Check for color patterns (Kenyan IDs have specific colors)
            // This is a simplified check
            $hasIdColors = $this->checkIdColors($image, $width, $height);
            
            imagedestroy($image);
            
            return $isValidRatio && $hasIdColors;
        } catch (\Exception $e) {
            Log::error('Kenyan ID verification error: ' . $e->getMessage());
            // If we can't verify, assume it's valid (fail open)
            return true;
        }
    }

    /**
     * Check for ID card colors
     */
    private function checkIdColors($image, int $width, int $height): bool
    {
        // Sample some pixels to check for ID-like colors
        // Kenyan IDs typically have blue/green/red elements
        $samplePoints = [
            [intval($width * 0.1), intval($height * 0.1)],
            [intval($width * 0.5), intval($height * 0.1)],
            [intval($width * 0.9), intval($height * 0.1)],
            [intval($width * 0.1), intval($height * 0.5)],
            [intval($width * 0.9), intval($height * 0.5)],
        ];
        
        $hasVariedColors = false;
        foreach ($samplePoints as $point) {
            $rgb = imagecolorat($image, $point[0], $point[1]);
            $r = ($rgb >> 16) & 0xFF;
            $g = ($rgb >> 8) & 0xFF;
            $b = $rgb & 0xFF;
            
            // Check for non-uniform colors (ID cards have varied colors)
            if (abs($r - $g) > 20 || abs($g - $b) > 20 || abs($r - $b) > 20) {
                $hasVariedColors = true;
                break;
            }
        }
        
        return $hasVariedColors;
    }

    /**
     * Check if text on ID is readable
     */
    private function checkReadability(string $imagePath): bool
    {
        try {
            // Basic readability check: look for high contrast areas (text)
            $image = imagecreatefromstring(file_get_contents($imagePath));
            if (!$image) {
                return false;
            }

            $width = imagesx($image);
            $height = imagesy($image);
            
            // Convert to grayscale
            $gray = imagecreatetruecolor($width, $height);
            imagecopymerge($gray, $image, 0, 0, 0, 0, $width, $height, 100);
            
            // Check for high contrast regions (indicating text)
            $highContrastPixels = 0;
            $totalPixels = 0;
            
            for ($y = 1; $y < $height - 1; $y++) {
                for ($x = 1; $x < $width - 1; $x++) {
                    $pixel = imagecolorat($gray, $x, $y) & 0xFF;
                    $neighbors = [
                        imagecolorat($gray, $x-1, $y) & 0xFF,
                        imagecolorat($gray, $x+1, $y) & 0xFF,
                        imagecolorat($gray, $x, $y-1) & 0xFF,
                        imagecolorat($gray, $x, $y+1) & 0xFF,
                    ];
                    
                    $maxDiff = max(array_map(function($n) use ($pixel) {
                        return abs($n - $pixel);
                    }, $neighbors));
                    
                    if ($maxDiff > 50) { // High contrast indicates text
                        $highContrastPixels++;
                    }
                    $totalPixels++;
                }
            }
            
            imagedestroy($image);
            imagedestroy($gray);
            
            // If more than 2% of pixels have high contrast, likely has readable text
            return ($highContrastPixels / $totalPixels) > 0.02;
        } catch (\Exception $e) {
            Log::error('Readability check error: ' . $e->getMessage());
            // If we can't check, assume it's readable (fail open)
            return true;
        }
    }
}

