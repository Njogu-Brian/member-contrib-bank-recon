<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== SMS Configuration Check ===\n\n";

// Check settings
$smsEnabled = \App\Models\Setting::get('sms_enabled', '0');
$smsUserId = \App\Models\Setting::get('sms_userid', '');
$smsPassword = \App\Models\Setting::get('sms_password', '');
$smsSenderId = \App\Models\Setting::get('sms_senderid', '');

echo "SMS Enabled (from settings): " . ($smsEnabled === '1' || $smsEnabled === 'true' ? 'YES' : 'NO') . "\n";
echo "SMS UserID: " . ($smsUserId ?: 'NOT SET') . "\n";
echo "SMS Password: " . ($smsPassword ? 'SET (' . strlen($smsPassword) . ' chars)' : 'NOT SET') . "\n";
echo "SMS SenderID: " . ($smsSenderId ?: 'NOT SET') . "\n";
echo "SMS Base URL: " . config('services.sms.base_url', 'NOT SET') . "\n\n";

// Check environment variables
echo "=== Environment Variables ===\n";
echo "SMS_ENABLED: " . (env('SMS_ENABLED') ?: 'NOT SET') . "\n";
echo "SMS_USERID: " . (env('SMS_USERID') ?: 'NOT SET') . "\n";
echo "SMS_PASSWORD: " . (env('SMS_PASSWORD') ? 'SET' : 'NOT SET') . "\n";
echo "SMS_SENDERID: " . (env('SMS_SENDERID') ?: 'NOT SET') . "\n\n";

// Test SMS service
echo "=== SMS Service Test ===\n";
try {
    $smsService = app(\App\Services\SmsService::class);
    $isEnabled = $smsService->isEnabled();
    echo "SMS Service Enabled: " . ($isEnabled ? 'YES' : 'NO') . "\n";
    
    if ($isEnabled) {
        echo "Testing SMS API connection...\n";
        // Test with a dummy number (won't actually send)
        $testResult = $smsService->send('254700000000', 'Test message');
        echo "Test Result: " . json_encode($testResult, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "SMS Service is disabled or not configured.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== Recent SMS Logs ===\n";
$recentLogs = \App\Models\SmsLog::orderBy('created_at', 'desc')->limit(5)->get();
if ($recentLogs->isEmpty()) {
    echo "No SMS logs found.\n";
} else {
    foreach ($recentLogs as $log) {
        echo sprintf(
            "[%s] %s -> %s: %s (%s)\n",
            $log->created_at,
            $log->phone,
            $log->status,
            $log->message ? substr($log->message, 0, 50) . '...' : 'N/A',
            $log->error ?: 'OK'
        );
    }
}

