<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Carbon\Carbon;

class AdminSettingsController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        
        // Add URLs for logo and favicon if they exist
        $logoUrl = null;
        $faviconUrl = null;
        
        if ($settings->get('logo_path')) {
            $logoUrl = Storage::disk('public')->url($settings->get('logo_path'));
        }
        
        if ($settings->get('favicon_path')) {
            $faviconUrl = Storage::disk('public')->url($settings->get('favicon_path'));
        }
        
        // Return all settings as a flat object (like SettingController)
        // This makes it easier for the frontend to consume
        $response = $settings->toArray();
        $response['logo_url'] = $logoUrl;
        $response['favicon_url'] = $faviconUrl;
        
        // Also include categories for admin settings UI
        $response['categories'] = [
            'general' => [
                'app_name',
                'app_description',
                'timezone',
                'date_format',
                'currency',
                'default_currency',
                'multi_currency_enabled',
            ],
            'branding' => [
                'theme_primary_color',
                'theme_secondary_color',
                'login_background_color',
                'login_text_color',
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
                // SMS and M-Pesa credentials are managed via .env file only for security
                // 'sms_userid', 'sms_password', 'sms_senderid' - removed (use .env)
                // 'mpesa_consumer_key', 'mpesa_consumer_secret' - removed (use .env)
            ],
            'security' => [
                'password_min_length',
                'require_mfa',
                'session_timeout',
            ],
        ];
        
        return response()->json($response);
    }

    public function update(Request $request)
    {
        Log::info('AdminSettings update called', [
            'has_logo' => $request->hasFile('logo'),
            'has_favicon' => $request->hasFile('favicon'),
            'all_files' => array_keys($request->allFiles()),
            'all_input_keys' => array_keys($request->all()),
            'content_type' => $request->header('Content-Type'),
            'request_method' => $request->method(),
        ]);
        
        // Handle file uploads for logo and favicon
        // Note: When using FormData, files need special validation
        $rules = [
            'contribution_start_date' => 'nullable|date',
            'weekly_contribution_amount' => 'nullable|numeric|min:0',
            'settings' => 'nullable|array',
            'settings.*' => 'nullable|string',
        ];
        
        // Only validate file if it's actually uploaded
        if ($request->hasFile('logo')) {
            $rules['logo'] = 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048';
        }
        
        if ($request->hasFile('favicon')) {
            $rules['favicon'] = 'required|image|mimes:jpeg,png,jpg,gif,svg,ico|max:512';
        }
        
        try {
            $validated = $request->validate($rules);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->except(['logo', 'favicon']),
            ]);
            throw $e;
        }

        $uploadedLogoPath = null;
        $uploadedFaviconPath = null;
        
        // Ensure settings directory exists
        $settingsDir = storage_path('app/public/settings');
        if (!file_exists($settingsDir)) {
            mkdir($settingsDir, 0755, true);
            Log::info('Created settings directory', ['path' => $settingsDir]);
        }
        
        // Handle logo upload
        if ($request->hasFile('logo')) {
            try {
                $logo = $request->file('logo');
                Log::info('Processing logo file', [
                    'original_name' => $logo->getClientOriginalName(),
                    'mime_type' => $logo->getMimeType(),
                    'size' => $logo->getSize(),
                    'is_valid' => $logo->isValid(),
                    'error' => $logo->getError(),
                ]);
                
                if (!$logo->isValid()) {
                    throw new \Exception('Invalid logo file: ' . $logo->getError());
                }
                
                $logoPath = $logo->store('settings', 'public');
                $uploadedLogoPath = $logoPath;
                
                // Delete old logo if exists
                $oldLogoPath = Setting::get('logo_path');
                if ($oldLogoPath && Storage::disk('public')->exists($oldLogoPath)) {
                    Storage::disk('public')->delete($oldLogoPath);
                }
                
                Setting::set('logo_path', $logoPath);
                
                // Verify file was saved
                $fullPath = Storage::disk('public')->path($logoPath);
                $exists = file_exists($fullPath);
                
                Log::info('Logo uploaded successfully', [
                    'path' => $logoPath,
                    'full_path' => $fullPath,
                    'exists' => $exists,
                    'full_url' => Storage::disk('public')->url($logoPath),
                ]);
            } catch (\Exception $e) {
                Log::error('Logo upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw $e;
            }
        }

        // Handle favicon upload
        if ($request->hasFile('favicon')) {
            try {
                $favicon = $request->file('favicon');
                Log::info('Processing favicon file', [
                    'original_name' => $favicon->getClientOriginalName(),
                    'mime_type' => $favicon->getMimeType(),
                    'size' => $favicon->getSize(),
                    'is_valid' => $favicon->isValid(),
                    'error' => $favicon->getError(),
                ]);
                
                if (!$favicon->isValid()) {
                    throw new \Exception('Invalid favicon file: ' . $favicon->getError());
                }
                
                $faviconPath = $favicon->store('settings', 'public');
                $uploadedFaviconPath = $faviconPath;
                
                // Delete old favicon if exists
                $oldFaviconPath = Setting::get('favicon_path');
                if ($oldFaviconPath && Storage::disk('public')->exists($oldFaviconPath)) {
                    Storage::disk('public')->delete($oldFaviconPath);
                }
                
                Setting::set('favicon_path', $faviconPath);
                
                // Verify file was saved
                $fullPath = Storage::disk('public')->path($faviconPath);
                $exists = file_exists($fullPath);
                
                Log::info('Favicon uploaded successfully', [
                    'path' => $faviconPath,
                    'full_path' => $fullPath,
                    'exists' => $exists,
                    'full_url' => Storage::disk('public')->url($faviconPath),
                ]);
            } catch (\Exception $e) {
                Log::error('Favicon upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw $e;
            }
        }

        // Handle contribution settings
        if ($request->has('contribution_start_date')) {
            Setting::set('contribution_start_date', $validated['contribution_start_date']);
        }
        
        if ($request->has('weekly_contribution_amount')) {
            Setting::set('weekly_contribution_amount', $validated['weekly_contribution_amount']);
        }

        // Handle other settings (from the nested 'settings' array or direct fields)
        if ($request->has('settings') && is_array($validated['settings'])) {
            foreach ($validated['settings'] as $key => $value) {
                Setting::set($key, $value);
            }
        }
        
        // Handle nested settings array first (from admin settings forms)
        if ($request->has('settings') && is_array($request->input('settings'))) {
            foreach ($request->input('settings') as $key => $value) {
                if ($value !== null && $value !== '') {
                    Setting::set($key, $value);
                }
            }
        }
        
               // Also handle direct setting fields (can come from formData or JSON)
               // Note: SMS and M-Pesa credentials are NOT configurable via UI - they must be in .env file
               $directSettingFields = ['app_name', 'app_description', 'timezone', 'date_format', 'currency', 
                                       'default_currency', 'sms_provider',
                                       'password_min_length', 'session_timeout', 
                                       'theme_primary_color', 'theme_secondary_color',
                                       'login_background_color', 'login_text_color', 'navbar_background_color'];
        
        foreach ($directSettingFields as $field) {
            // Check both input() and has() because FormData fields might not trigger has()
            $value = $request->input($field);
            if ($value !== null && $value !== '') {
                Setting::set($field, $value);
                Log::info("Setting saved: {$field}", ['value' => $value, 'type' => gettype($value)]);
                
                // If timezone is updated, clear config cache and update PHP timezone
                if ($field === 'timezone' && in_array($value, timezone_identifiers_list())) {
                    \Illuminate\Support\Facades\Config::set('app.timezone', $value);
                    date_default_timezone_set($value);
                    \Carbon\Carbon::setToStringFormat('Y-m-d H:i:s');
                    Cache::forget('config');
                }
            }
        }
        
        // Handle boolean settings (enabled flags)
        // Note: sms_enabled and mpesa_enabled should be set in .env, but we allow UI toggle for convenience
        // The actual credentials (userid, password, etc.) MUST be in .env only
        $booleanFields = ['mpesa_enabled', 'sms_enabled', 'fcm_enabled', 'pdf_service_enabled',
                         'bulk_bank_enabled', 'ocr_matching_enabled', 'require_mfa', 'multi_currency_enabled'];
        
        foreach ($booleanFields as $field) {
            if ($request->has($field)) {
                $value = $request->input($field);
                // Handle string '1'/'0', boolean true/false, or numeric 1/0
                $boolValue = ($value === '1' || $value === 'true' || $value === true || $value === 1);
                Setting::set($field, $boolValue ? '1' : '0');
            }
        }

        Cache::forget('settings');

        // Return all updated settings with URLs
        // IMPORTANT: Reload settings from database to get fresh data including newly saved paths
        $settings = Setting::all()->pluck('value', 'key');
        $response = $settings->toArray();
        $response['message'] = 'Settings updated successfully';
        $response['contribution_start_date'] = $settings->get('contribution_start_date');
        $response['weekly_contribution_amount'] = $settings->get('weekly_contribution_amount');
        
        // Use uploaded paths if available, otherwise fall back to settings
        $logoPath = $uploadedLogoPath ?? $settings->get('logo_path');
        $faviconPath = $uploadedFaviconPath ?? $settings->get('favicon_path');
        
        $response['logo_url'] = null;
        $response['favicon_url'] = null;
        
        Log::info('Checking for saved files', [
            'uploaded_logo_path' => $uploadedLogoPath,
            'uploaded_favicon_path' => $uploadedFaviconPath,
            'logo_path_from_db' => $settings->get('logo_path'),
            'favicon_path_from_db' => $settings->get('favicon_path'),
            'using_logo_path' => $logoPath,
            'using_favicon_path' => $faviconPath,
        ]);
        
        if ($logoPath) {
            $logoFullPath = Storage::disk('public')->path($logoPath);
            $logoExists = file_exists($logoFullPath);
            
            if ($logoExists) {
                $response['logo_url'] = Storage::disk('public')->url($logoPath);
                Log::info('Logo URL generated', [
                    'path' => $logoPath,
                    'url' => $response['logo_url'],
                    'full_path' => $logoFullPath,
                ]);
            } else {
                Log::warning('Logo file not found at path', [
                    'path' => $logoFullPath,
                    'stored_path' => $logoPath,
                    'storage_root' => Storage::disk('public')->path(''),
                ]);
            }
        }
        
        if ($faviconPath) {
            $faviconFullPath = Storage::disk('public')->path($faviconPath);
            $faviconExists = file_exists($faviconFullPath);
            
            if ($faviconExists) {
                $response['favicon_url'] = Storage::disk('public')->url($faviconPath);
                Log::info('Favicon URL generated', [
                    'path' => $faviconPath,
                    'url' => $response['favicon_url'],
                    'full_path' => $faviconFullPath,
                ]);
            } else {
                Log::warning('Favicon file not found at path', [
                    'path' => $faviconFullPath,
                    'stored_path' => $faviconPath,
                    'storage_root' => Storage::disk('public')->path(''),
                ]);
            }
        }
        
        // Include categories for frontend
        $response['categories'] = [
            'general' => [
                'app_name',
                'app_description',
                'timezone',
                'date_format',
                'currency',
                'default_currency',
                'multi_currency_enabled',
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
                // SMS and M-Pesa credentials are managed via .env file only for security
                // 'sms_userid', 'sms_password', 'sms_senderid' - removed (use .env)
                // 'mpesa_consumer_key', 'mpesa_consumer_secret' - removed (use .env)
            ],
            'security' => [
                'password_min_length',
                'require_mfa',
                'session_timeout',
            ],
            'branding' => [
                'theme_primary_color',
                'theme_secondary_color',
                'login_background_color',
                'login_text_color',
            ],
        ];

        return response()->json($response);
    }
}

