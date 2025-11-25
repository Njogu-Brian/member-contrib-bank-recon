<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminSettingsController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        
        return response()->json([
            'settings' => $settings,
            'categories' => [
                'general' => [
                    'app_name',
                    'app_description',
                    'timezone',
                    'date_format',
                    'currency',
                ],
                'features' => [
                    'mpesa_enabled',
                    'sms_enabled',
                    'fcm_enabled',
                    'pdf_service_enabled',
                    'bulk_bank_enabled',
                    'ocr_matching_enabled',
                ],
                'integrations' => [
                    'sms_provider',
                    'sms_userid',
                    'sms_senderid',
                    'mpesa_consumer_key',
                    'mpesa_consumer_secret',
                ],
                'security' => [
                    'password_min_length',
                    'require_mfa',
                    'session_timeout',
                ],
            ],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        Cache::forget('settings');

        return response()->json(['message' => 'Settings updated successfully']);
    }
}

