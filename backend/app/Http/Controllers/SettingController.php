<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'contribution_start_date' => 'nullable|date',
            'weekly_contribution_amount' => 'nullable|numeric|min:0',
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }
}

