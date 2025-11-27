<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;
use Carbon\Carbon;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Set timezone dynamically from settings or use default
        try {
            // Check if database connection is available
            if (\Illuminate\Support\Facades\Schema::hasTable('settings')) {
                $timezone = \App\Models\Setting::get('timezone', config('app.timezone', 'Africa/Nairobi'));
            } else {
                $timezone = config('app.timezone', 'Africa/Nairobi');
            }
            
            // Validate timezone
            if (in_array($timezone, timezone_identifiers_list())) {
                Config::set('app.timezone', $timezone);
                date_default_timezone_set($timezone);
                Carbon::setLocale(config('app.locale', 'en'));
                
                // Set Carbon default timezone - Carbon uses PHP's default timezone
                Carbon::setToStringFormat('Y-m-d H:i:s');
            } else {
                // Fallback to default if invalid timezone
                $timezone = 'Africa/Nairobi';
                Config::set('app.timezone', $timezone);
                date_default_timezone_set($timezone);
            }
        } catch (\Exception $e) {
            // If database is not available or settings table doesn't exist, use default
            $timezone = config('app.timezone', 'Africa/Nairobi');
            date_default_timezone_set($timezone);
        }
    }
}

