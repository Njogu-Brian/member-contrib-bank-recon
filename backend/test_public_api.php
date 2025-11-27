<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Member;

$token = 'jBpzgczTXRCNAIVBarC193FU0GFdFK22';

$member = Member::where('public_share_token', $token)
    ->where('is_active', true)
    ->first();

if ($member) {
    echo "✓ Member found: {$member->name} (ID: {$member->id})\n";
    echo "✓ Token is valid: {$token}\n";
    echo "✓ Link: https://evimeria.breysomsolutions.co.ke/s/{$token}\n";
} else {
    echo "✗ Member not found or inactive\n";
    echo "Token: {$token}\n";
}

