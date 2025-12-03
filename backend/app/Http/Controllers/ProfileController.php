<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    /**
     * Check member profile completion status
     */
    public function checkProfileStatus($token)
    {
        $member = Member::where('public_share_token', $token)->firstOrFail();

        return response()->json([
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
        ]);
    }

    /**
     * Update member profile
     */
    public function updateProfile(Request $request, $token)
    {
        $member = Member::where('public_share_token', $token)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'secondary_phone' => 'nullable|string|max:20',
            'email' => 'required|email|max:255',
            'id_number' => 'required|string|max:50',
            'church' => 'required|string|max:255',
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

        return response()->json([
            'message' => 'Profile updated successfully',
            'is_complete' => $member->isProfileComplete(),
            'profile_completed_at' => $member->profile_completed_at,
        ]);
    }
}
