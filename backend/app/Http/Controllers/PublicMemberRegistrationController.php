<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;

class PublicMemberRegistrationController extends Controller
{
    /**
     * Public member signup - creates a member with is_active=false, registration_requested_at=now.
     * Admin must approve (set is_active=true) before the member can access their statement.
     */
    public function register(Request $request)
    {
        // Rate limit: 5 signups per hour per IP
        $key = 'public-member-signup:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'message' => 'Too many registration attempts. Please try again later.',
            ], 429);
        }
        RateLimiter::hit($key, 3600);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+254[17]\d{8}$/', 'unique:members,phone'],
            'whatsapp_number' => ['nullable', 'string', 'max:20', 'regex:/^\+254[17]\d{8}$/', 'unique:members,whatsapp_number'],
            'email' => 'required|email|max:255|unique:members,email',
            'id_number' => ['required', 'string', 'max:50', 'unique:members,id_number'],
            'church' => 'required|string|max:255',
            'gender' => 'nullable|string|in:male,female,other',
            'next_of_kin_name' => 'required|string|max:255',
            'next_of_kin_phone' => ['required', 'string', 'max:20', 'regex:/^\+254[17]\d{8}$/'],
            'next_of_kin_relationship' => 'required|string|max:255',
        ], [
            'phone.regex' => 'Phone must be a valid Kenyan number (e.g. +254712345678)',
            'phone.unique' => 'This phone number is already registered.',
            'email.unique' => 'This email is already registered.',
            'id_number.unique' => 'This ID number is already registered.',
        ]);

        try {
            $member = Member::create([
                ...$validated,
                'is_active' => false,
                'date_of_registration' => now(),
                'registration_requested_at' => now(),
            ]);

            $member->getPublicShareToken();
            $member->refresh();

            Log::info('Public member signup received', [
                'member_id' => $member->id,
                'name' => $member->name,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Your application has been submitted successfully. You will be notified once an administrator approves your membership.',
                'member_id' => $member->id,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Public member signup failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->except(['password']),
            ]);
            return response()->json([
                'message' => 'Registration failed. Please try again or contact support.',
            ], 500);
        }
    }
}
