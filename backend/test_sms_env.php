<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$sms = app(\App\Services\SmsService::class);

$reflection = new ReflectionClass($sms);
$userId = $reflection->getProperty('userId')->getValue($sms);
$password = $reflection->getProperty('password')->getValue($sms);
$senderId = $reflection->getProperty('senderId')->getValue($sms);
$enabled = $reflection->getProperty('enabled')->getValue($sms);

echo "=== SMS Service Configuration (from .env) ===\n";
echo "Enabled: " . ($enabled ? 'YES' : 'NO') . "\n";
echo "UserID: " . ($userId ?: 'NOT SET') . "\n";
echo "Password: " . ($password ? 'SET (' . strlen($password) . ' chars)' : 'NOT SET') . "\n";
echo "SenderID: " . ($senderId ?: 'NOT SET') . "\n";
echo "Is Enabled Check: " . ($sms->isEnabled() ? 'YES' : 'NO') . "\n";

