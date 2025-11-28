<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BankStatement;
use Illuminate\Support\Facades\Storage;

$statement = BankStatement::find(8);

if ($statement) {
    echo "========================================\n";
    echo "Statement 8 Details:\n";
    echo "========================================\n";
    echo "ID: {$statement->id}\n";
    echo "Filename: {$statement->filename}\n";
    echo "File path: {$statement->file_path}\n";
    echo "Status: {$statement->status}\n";
    
    if ($statement->file_path) {
        $exists = Storage::disk('statements')->exists($statement->file_path);
        echo "File exists: " . ($exists ? 'Yes' : 'No') . "\n";
        
        if ($exists) {
            $fullPath = Storage::disk('statements')->path($statement->file_path);
            echo "Full path: {$fullPath}\n";
            echo "File readable: " . (is_readable($fullPath) ? 'Yes' : 'No') . "\n";
            echo "File size: " . filesize($fullPath) . " bytes\n";
        } else {
            echo "ERROR: File path exists in database but file not found in storage!\n";
            echo "Storage root: " . Storage::disk('statements')->path('') . "\n";
        }
    } else {
        echo "ERROR: No file_path set for this statement!\n";
    }
} else {
    echo "Statement 8 not found\n";
}

