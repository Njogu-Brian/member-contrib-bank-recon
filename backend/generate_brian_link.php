<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Member;

// Find Brian Njogu
$member = Member::where('name', 'LIKE', '%Brian%')
    ->where('name', 'LIKE', '%Njogu%')
    ->first();

if (!$member) {
    // Try alternative search
    $member = Member::where('name', 'LIKE', '%Njogu%')
        ->where('name', 'LIKE', '%Brian%')
        ->first();
}

if (!$member) {
    echo "Member 'Brian Njogu' not found. Available members:\n";
    $members = Member::limit(10)->get(['id', 'name', 'email']);
    foreach ($members as $m) {
        echo "  - {$m->name} (ID: {$m->id})\n";
    }
    exit(1);
}

// Ensure member has a token
$token = $member->getPublicShareToken();
$member->refresh();

$baseUrl = env('APP_URL', 'https://evimeria.breysomsolutions.co.ke');
$link = rtrim($baseUrl, '/') . '/s/' . $token;

echo "\n";
echo "========================================\n";
echo "Brian Njogu Public Statement Link:\n";
echo "========================================\n";
echo $link . "\n";
echo "========================================\n";
echo "Member: {$member->name} (ID: {$member->id})\n";
echo "Token: {$token}\n";
echo "Email: {$member->email}\n";
echo "Phone: {$member->phone}\n";
echo "Active: " . ($member->is_active ? 'Yes' : 'No') . "\n";
echo "========================================\n\n";

