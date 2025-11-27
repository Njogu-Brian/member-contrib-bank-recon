<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Member;

echo "=== SMS Statement Link Format ===\n\n";

// Get first member as example
$member = Member::first();

if (!$member) {
    echo "No members found in database.\n";
    exit(1);
}

// Get the public share token
$token = $member->getPublicShareToken();

// Get base URL (same logic as SmsService)
$baseUrl = env('FRONTEND_URL', config('app.url', 'http://localhost:5173'));
if (!preg_match('/^https?:\/\//', $baseUrl)) {
    $baseUrl = 'https://' . ltrim($baseUrl, '/');
}
$baseUrl = rtrim($baseUrl, '/');

// Generate the link (same logic as SmsService::generatePublicStatementLink)
$link = $baseUrl . '/s/' . $token;

echo "Member: {$member->name} (ID: {$member->id})\n";
echo "Token: {$token}\n";
echo "Base URL: {$baseUrl}\n";
echo "\n";
echo "=== SMS Link ===\n";
echo $link . "\n";
echo "\n";
echo "Link Length: " . strlen($link) . " characters\n";
echo "\n";
echo "=== Example SMS Message ===\n";
echo "Hello {$member->name}, view your statement: {$link}\n";

