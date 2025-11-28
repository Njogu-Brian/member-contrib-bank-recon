<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BankStatement;
use Illuminate\Support\Facades\Storage;

$statement = BankStatement::find(8);

if (!$statement) {
    echo "Statement 8 not found\n";
    exit(1);
}

echo "========================================\n";
echo "Fixing Statement 8\n";
echo "========================================\n";
echo "Current file_path: {$statement->file_path}\n";

// Check if a similar file exists
$similarFiles = [
    '1764007852_EVIMERIA (1).pdf',
    '1764050215_EVIMERIA (1).pdf',
];

$foundFile = null;
foreach ($similarFiles as $file) {
    if (Storage::disk('statements')->exists($file)) {
        $foundFile = $file;
        echo "Found similar file: {$file}\n";
        break;
    }
}

if ($foundFile) {
    // Check if this file is already assigned to another statement
    $existingStatement = BankStatement::where('file_path', $foundFile)
        ->where('id', '!=', 8)
        ->first();
    
    if ($existingStatement) {
        echo "WARNING: File {$foundFile} is already assigned to statement {$existingStatement->id}\n";
        echo "Cannot automatically fix - file is in use by another statement.\n";
    } else {
        $statement->file_path = $foundFile;
        $statement->save();
        echo "SUCCESS: Updated statement 8 to use file: {$foundFile}\n";
    }
} else {
    echo "ERROR: No similar file found. Statement 8 needs to be re-uploaded.\n";
    echo "The file '1764148919_EVIMERIA (1).pdf' is missing from storage.\n";
}

