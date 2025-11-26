<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class SettingController extends Controller
{
    /**
     * Public settings for login page (no auth required)
     * Returns only branding/public settings
     */
    public function publicIndex()
    {
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
        if ($settings->get('logo_path')) {
            $response['logo_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($settings->get('logo_path'));
        }
        
        if ($settings->get('favicon_path')) {
            $response['favicon_url'] = \Illuminate\Support\Facades\Storage::disk('public')->url($settings->get('favicon_path'));
        }
        
        return response()->json($response);
    }

    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        
        // Add URLs for logo and favicon if they exist
        $settings['logo_url'] = null;
        $settings['favicon_url'] = null;
        
        if ($settings->get('logo_path')) {
            $settings['logo_url'] = Storage::disk('public')->url($settings->get('logo_path'));
        }
        
        if ($settings->get('favicon_path')) {
            $settings['favicon_url'] = Storage::disk('public')->url($settings->get('favicon_path'));
        }
        
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'contribution_start_date' => 'nullable|date',
            'weekly_contribution_amount' => 'nullable|numeric|min:0',
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

