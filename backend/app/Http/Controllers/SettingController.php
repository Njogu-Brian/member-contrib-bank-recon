<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\QueryException;

class SettingController extends Controller
{
    /**
     * Public settings for login page (no auth required)
     * Returns only branding/public settings
     */
    public function publicIndex()
    {
        try {
            $settings = \App\Models\Setting::whereIn('key', [
                'app_name',
                'logo_path',
                'favicon_path',
                'theme_primary_color',
                'theme_secondary_color',
                'login_background_color',
                'login_text_color',
                'navbar_background_color',
            ])->pluck('value', 'key');
            
            $response = $settings->toArray();
            
            // Add URLs for logo and favicon if they exist
            try {
                if ($settings->get('logo_path')) {
                    $response['logo_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($settings->get('logo_path'));
                }
                
                if ($settings->get('favicon_path')) {
                    $response['favicon_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($settings->get('favicon_path'));
                }
            } catch (\Exception $e) {
                Log::warning('Error getting logo/favicon URLs: ' . $e->getMessage());
            }
            
            return response()->json($response);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error in publicIndex: ' . $e->getMessage());
            // Return default settings if database is unavailable
            return response()->json([
                'app_name' => 'Member Contributions System',
                'logo_url' => null,
                'favicon_url' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in publicIndex: ' . $e->getMessage());
            return response()->json([
                'app_name' => 'Member Contributions System',
                'logo_url' => null,
                'favicon_url' => null,
            ], 500);
        }
    }

    public function index()
    {
        try {
            // Try to get settings from database, but handle database connection issues gracefully
            try {
                $settings = Setting::all()->pluck('value', 'key');
            } catch (\Illuminate\Database\QueryException $e) {
                Log::warning('Database error in SettingController::index', [
                    'error' => $e->getMessage(),
                ]);
                // Return empty settings if database is unavailable
                $settings = collect();
            } catch (\Exception $e) {
                Log::warning('Error loading settings from database', [
                    'error' => $e->getMessage(),
                ]);
                $settings = collect();
            }
            
            // Add URLs for logo and favicon if they exist
            $logoUrl = null;
            $faviconUrl = null;
            
            try {
                if ($settings->get('logo_path')) {
                    $logoPath = $settings->get('logo_path');
                    if (Storage::disk('public')->exists($logoPath)) {
                        $logoUrl = Storage::disk('public')->url($logoPath);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Error getting logo URL', ['error' => $e->getMessage()]);
            }
            
            try {
                if ($settings->get('favicon_path')) {
                    $faviconPath = $settings->get('favicon_path');
                    if (Storage::disk('public')->exists($faviconPath)) {
                        $faviconUrl = Storage::disk('public')->url($faviconPath);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Error getting favicon URL', ['error' => $e->getMessage()]);
            }
            
            // Convert to array and add URLs
            $response = $settings->toArray();
            $response['logo_url'] = $logoUrl;
            $response['favicon_url'] = $faviconUrl;
            
            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('Error in SettingController::index', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Return empty response instead of 500 to prevent blocking login
            // The frontend will handle empty settings gracefully
            return response()->json([
                'logo_url' => null,
                'favicon_url' => null,
            ]);
        }
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'contribution_start_date' => 'nullable|date',
            'weekly_contribution_amount' => 'nullable|numeric|min:0',
            'contact_phone' => 'nullable|string|max:20',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'favicon' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,ico|max:512',
        ]);

        // Handle logo upload
        if ($request->hasFile('logo')) {
            $logo = $request->file('logo');
            $logoPath = $logo->store('settings', 'public');
            
            // Delete old logo if exists
            $oldLogoPath = Setting::get('logo_path');
            if ($oldLogoPath && Storage::disk('public')->exists($oldLogoPath)) {
                Storage::disk('public')->delete($oldLogoPath);
            }
            
            Setting::set('logo_path', $logoPath);
            Log::info('Logo uploaded', ['path' => $logoPath]);
        }

        // Handle favicon upload
        if ($request->hasFile('favicon')) {
            $favicon = $request->file('favicon');
            $faviconPath = $favicon->store('settings', 'public');
            
            // Delete old favicon if exists
            $oldFaviconPath = Setting::get('favicon_path');
            if ($oldFaviconPath && Storage::disk('public')->exists($oldFaviconPath)) {
                Storage::disk('public')->delete($oldFaviconPath);
            }
            
            Setting::set('favicon_path', $faviconPath);
            Log::info('Favicon uploaded', ['path' => $faviconPath]);
        }

        // Update other settings (even if null, to allow clearing)
        if ($request->has('contribution_start_date')) {
            Setting::set('contribution_start_date', $validated['contribution_start_date']);
        }
        
        if ($request->has('weekly_contribution_amount')) {
            Setting::set('weekly_contribution_amount', $validated['weekly_contribution_amount']);
        }
        
        if ($request->has('contact_phone')) {
            Setting::set('contact_phone', $validated['contact_phone']);
        }

        // Return updated settings
        $settings = Setting::all()->pluck('value', 'key');
        $response = [
            'message' => 'Settings updated successfully',
            'contribution_start_date' => $settings->get('contribution_start_date'),
            'weekly_contribution_amount' => $settings->get('weekly_contribution_amount'),
        ];
        
        // Add URLs for logo and favicon if they exist
        if ($settings->get('logo_path')) {
            $response['logo_url'] = Storage::disk('public')->url($settings->get('logo_path'));
        }
        if ($settings->get('favicon_path')) {
            $response['favicon_url'] = Storage::disk('public')->url($settings->get('favicon_path'));
        }

        return response()->json($response);
    }
}

