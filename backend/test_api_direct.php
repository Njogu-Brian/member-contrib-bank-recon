<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\PublicMemberStatementController;

$token = 'jBpzgczTXRCNAIVBarC193FU0GFdFK22';

// Create a request object
$request = Request::create("/api/v1/public/statement/{$token}", 'GET', [
    'page' => 1,
    'per_page' => 25,
]);

// Handle the request through Laravel
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle($request);

echo "Status Code: " . $response->getStatusCode() . "\n";
echo "Content Type: " . $response->headers->get('Content-Type') . "\n";
echo "\nResponse Body:\n";
echo $response->getContent() . "\n";

