<?php

/**
 * cPanel Deployment - Public index.php
 * 
 * Copy this file to: ~/public_html/statement/index.php
 * Or: ~/breysomsolutions.co.ke/public_html/statement/index.php
 * 
 * Update the $appPath variable below to match your server structure
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// ========================================
// CONFIGURATION - UPDATE THIS PATH
// ========================================
// Update this to point to your Laravel backend directory
// Example: /home2/royalce1/laravel-ap/member-contributions/backend
$appPath = '/home2/royalce1/laravel-ap/member-contributions/backend';

// Or use environment variable (set in .htaccess or cPanel)
if (isset($_ENV['APP_BASE_PATH'])) {
    $appPath = $_ENV['APP_BASE_PATH'];
}

// ========================================
// Maintenance Mode Check
// ========================================
$maintenanceFile = $appPath . '/storage/framework/maintenance.php';
if (file_exists($maintenanceFile)) {
    require $maintenanceFile;
}

// ========================================
// Register The Auto Loader
// ========================================
require $appPath . '/vendor/autoload.php';

// ========================================
// Run The Application
// ========================================
$app = require_once $appPath . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);

