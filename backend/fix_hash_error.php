<?php
/**
 * Fix "Target class [hash] does not exist" error
 * Run: php fix_hash_error.php
 */

echo "=== Fixing Hash Service Error ===\n\n";

$backendPath = __DIR__;

// Remove all cache files
echo "1. Removing cache files...\n";
$cacheFiles = [
    $backendPath . '/bootstrap/cache/config.php',
    $backendPath . '/bootstrap/cache/routes.php',
    $backendPath . '/bootstrap/cache/routes-v7.php',
    $backendPath . '/bootstrap/cache/services.php',
    $backendPath . '/bootstrap/cache/packages.php',
];

foreach ($cacheFiles as $file) {
    if (file_exists($file)) {
        unlink($file);
        echo "   ✓ Removed: " . basename($file) . "\n";
    }
}

// Clear Laravel caches using artisan
echo "\n2. Clearing Laravel caches...\n";
$commands = [
    'config:clear',
    'route:clear',
    'cache:clear',
    'view:clear',
];

foreach ($commands as $cmd) {
    $output = [];
    $return = 0;
    exec("php artisan $cmd 2>&1", $output, $return);
    if ($return === 0) {
        echo "   ✓ $cmd\n";
    } else {
        echo "   ⚠ $cmd (may have warnings, but continuing...)\n";
    }
}

// Verify Hash facade is available
echo "\n3. Verifying Hash facade...\n";
try {
    require $backendPath . '/vendor/autoload.php';
    $app = require_once $backendPath . '/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    
    // Test Hash facade
    $testHash = Illuminate\Support\Facades\Hash::make('test');
    if ($testHash) {
        echo "   ✓ Hash facade is working\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n=== Fix Complete ===\n";
echo "Try accessing the application now.\n";
echo "If errors persist, check: storage/logs/laravel.log\n";

