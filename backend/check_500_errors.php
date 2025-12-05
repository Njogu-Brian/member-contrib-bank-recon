<?php
/**
 * Check for 500 errors in Laravel logs
 * Run on production: php check_500_errors.php
 */

$logFile = __DIR__ . '/storage/logs/laravel.log';

if (!file_exists($logFile)) {
    echo "Log file not found: $logFile\n";
    exit(1);
}

echo "=== Checking Last 100 Lines of Laravel Log ===\n\n";

$lines = file($logFile);
$lastLines = array_slice($lines, -100);

$errors = [];
$currentError = null;

foreach ($lastLines as $line) {
    if (preg_match('/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\].*ERROR/', $line, $matches)) {
        if ($currentError) {
            $errors[] = $currentError;
        }
        $currentError = ['time' => $matches[1], 'message' => $line, 'trace' => []];
    } elseif ($currentError && (strpos($line, '#') === 0 || strpos($line, 'Stack trace') !== false)) {
        $currentError['trace'][] = $line;
    } elseif ($currentError && trim($line) !== '') {
        $currentError['message'] .= $line;
    }
}

if ($currentError) {
    $errors[] = $currentError;
}

if (empty($errors)) {
    echo "No recent errors found in log.\n";
    echo "\nLast 20 lines of log:\n";
    echo implode('', array_slice($lastLines, -20));
} else {
    echo "Found " . count($errors) . " recent error(s):\n\n";
    foreach (array_slice($errors, -5) as $error) {
        echo "Time: {$error['time']}\n";
        echo "Error: " . substr($error['message'], 0, 200) . "...\n";
        if (!empty($error['trace'])) {
            echo "Trace (first 5 lines):\n";
            echo implode('', array_slice($error['trace'], 0, 5));
        }
        echo "\n" . str_repeat('-', 80) . "\n\n";
    }
}

// Also check for syntax errors in updated files
echo "\n=== Checking PHP Syntax ===\n\n";

$files = [
    __DIR__ . '/app/Models/Member.php',
    __DIR__ . '/app/Http/Controllers/ProfileController.php',
];

foreach ($files as $file) {
    if (!file_exists($file)) {
        echo "⚠ File not found: $file\n";
        continue;
    }
    
    $output = [];
    $return = 0;
    exec("php -l " . escapeshellarg($file) . " 2>&1", $output, $return);
    
    if ($return === 0) {
        echo "✓ " . basename($file) . " - Syntax OK\n";
    } else {
        echo "✗ " . basename($file) . " - Syntax Error:\n";
        echo implode("\n", $output) . "\n";
    }
}

