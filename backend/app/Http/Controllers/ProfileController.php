<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Cache;

class ProfileController extends Controller
{
    /**
     * Check member profile completion status
     */
    public function checkProfileStatus($token)
    {
        // Rate limiting: max 30 requests per minute per IP
        $key = 'profile-status:' . request()->ip() . ':' . $token;
        if (RateLimiter::tooManyAttempts($key, 30)) {
            return response()->json([
                'error' => 'Too many requests',
                'message' => 'Please wait a moment before trying again.',
            ], 429);
        }
        RateLimiter::hit($key, 60); // 1 minute window

        // Cache profile status for 5 minutes to reduce database load
        $cacheKey = 'profile-status:' . $token;
        $data = Cache::remember($cacheKey, 300, function () use ($token) {
            $member = Member::where('public_share_token', $token)->firstOrFail();

            return [
                'is_complete' => $member->isProfileComplete(),
                'missing_fields' => $member->getMissingProfileFields(),
                'profile_completed_at' => $member->profile_completed_at,
                'member' => [
                    'name' => $member->name,
                    'phone' => $member->phone,
                    'secondary_phone' => $member->secondary_phone,
                    'email' => $member->email,
                    'id_number' => $member->id_number,
                    'church' => $member->church,
                    'member_code' => $member->member_code,
                    'member_number' => $member->member_number,
                ],
            ];
        });

        return response()->json($data);
    }

    /**
     * Update member profile
     */
    public function updateProfile(Request $request, $token)
    {
        // Rate limiting: max 10 update attempts per hour per IP
        $key = 'profile-update:' . $request->ip() . ':' . $token;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json([
                'error' => 'Too many update attempts',
                'message' => 'Please wait before trying again.',
            ], 429);
        }
        RateLimiter::hit($key, 3600); // 1 hour window

        $member = Member::where('public_share_token', $token)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+\d{1,4}\d{6,14}$/'],
            'secondary_phone' => ['nullable', 'string', 'max:20', 'regex:/^\+\d{1,4}\d{6,14}$/'],
            'email' => 'required|email|max:255',
            'id_number' => ['required', 'string', 'regex:/^\d+$/', 'min:5', 'max:20'],
            'church' => 'required|string|max:255',
        ], [
            'phone.regex' => 'Phone number must start with + followed by country code and number (e.g., +254712345678)',
            'secondary_phone.regex' => 'WhatsApp number must start with + followed by country code and number',
            'id_number.regex' => 'ID Number must contain only digits',
            'id_number.min' => 'ID Number must be at least 5 digits',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Update member
        $member->update([
            'name' => $request->name,
            'phone' => $request->phone,
            'secondary_phone' => $request->secondary_phone,
            'email' => $request->email,
            'id_number' => $request->id_number,
            'church' => $request->church,
        ]);

        // Mark profile as complete if all required fields are filled
        $member->markProfileComplete();

        // Clear cached profile status after update
        Cache::forget('profile-status:' . $token);

        return response()->json([
            'message' => 'Profile updated successfully',
            'is_complete' => $member->isProfileComplete(),
            'profile_completed_at' => $member->profile_completed_at,
        ]);
    }
}
