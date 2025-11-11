<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| Check If The Application Is Under Maintenance
|--------------------------------------------------------------------------
|
| If the application is in maintenance / demo mode via the "down" command
| we will load this file so that any pre-rendered content can be shown
| instead of starting the framework, which could cause an exception.
|
*/

// For cPanel deployment: Check if APP_BASE_PATH is set, otherwise use default Laravel structure
// This will work for both local development and cPanel deployment
$appBasePath = $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__);

// Check if we're in cPanel deployment (public files are separate from app)
// If index.php is in public_html/statement but app is in laravel-ap/member-contributions/backend
if (!file_exists($appBasePath . '/bootstrap/app.php')) {
    // Try cPanel path structure
    $homeDir = $_SERVER['HOME'] ?? getenv('HOME') ?? '/home2/royalce1';
    $cPanelAppPath = $homeDir . '/laravel-ap/member-contributions/backend';
    
    if (file_exists($cPanelAppPath . '/bootstrap/app.php')) {
        $appBasePath = $cPanelAppPath;
    }
}

$maintenanceFile = $appBasePath . '/storage/framework/maintenance.php';

if (file_exists($maintenanceFile)) {
    require $maintenanceFile;
}

/*
|--------------------------------------------------------------------------
| Register The Auto Loader
|--------------------------------------------------------------------------
|
| Composer provides a convenient, automatically generated class loader for
| this application. We just need to utilize it! We'll simply require it
| into the script here so we don't need to manually load our classes.
|
*/

require $appBasePath . '/vendor/autoload.php';

/*
|--------------------------------------------------------------------------
| Run The Application
|--------------------------------------------------------------------------
|
| Once we have the application, we can handle the incoming request using
| the application's HTTP kernel. Then, we will send the response back
| to this client's browser, allowing them to enjoy our application.
|
*/

$app = require_once $appBasePath . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
