<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "========================================\n";
echo "Timezone Configuration Check\n";
echo "========================================\n";
echo "Config timezone: " . config('app.timezone') . "\n";
echo "PHP timezone: " . date_default_timezone_get() . "\n";
echo "Current time: " . now()->format('Y-m-d H:i:s T') . "\n";
echo "Carbon timezone: " . \Carbon\Carbon::now()->timezone->getName() . "\n";

$settingTimezone = \App\Models\Setting::get('timezone');
if ($settingTimezone) {
    echo "Database timezone setting: " . $settingTimezone . "\n";
} else {
    echo "Database timezone setting: Not set (using default)\n";
}

echo "========================================\n";

