<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Member;

// Get the first member with a token, or create one if none exists
$member = Member::whereNotNull('public_share_token')->first();

if (!$member) {
    // Get any member and generate a token
    $member = Member::first();
    if ($member) {
        $member->getPublicShareToken(); // This will generate and save the token
        $member->refresh();
    }
}

if ($member && $member->public_share_token) {
    $baseUrl = env('APP_URL', 'https://evimeria.breysomsolutions.co.ke');
    $link = rtrim($baseUrl, '/') . '/s/' . $member->public_share_token;
    
    echo "\n";
    echo "========================================\n";
    echo "Test Public Statement Link:\n";
    echo "========================================\n";
    echo $link . "\n";
    echo "========================================\n";
    echo "Member: {$member->name} (ID: {$member->id})\n";
    echo "Token: {$member->public_share_token}\n";
    echo "========================================\n\n";
} else {
    echo "No members found in database.\n";
}

