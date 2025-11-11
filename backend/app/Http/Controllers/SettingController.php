<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->mapWithKeys(function ($setting) {
            return [$setting->key => [
                'value' => $setting->value,
                'type' => $setting->type,
                'description' => $setting->description,
            ]];
        });

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $request->validate([
            'contribution_start_date' => 'nullable|date',
        ]);

        if ($request->has('contribution_start_date')) {
            Setting::set('contribution_start_date', $request->contribution_start_date, 'date', 'The start date for calculating contribution weeks');
        }

        return response()->json([
            'message' => 'Settings updated successfully',
            'settings' => Setting::all()->mapWithKeys(function ($setting) {
                return [$setting->key => $setting->value];
            }),
        ]);
    }

    public function getCurrentWeek()
    {
        $startDate = Setting::getContributionStartDate();
        $currentWeek = Setting::getCurrentWeek();

        return response()->json([
            'start_date' => $startDate?->format('Y-m-d'),
            'current_week' => $currentWeek,
            'today' => now('Africa/Nairobi')->format('Y-m-d'),
        ]);
    }
}

