<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UpdateTokenActivity
{
    /**
     * Handle an incoming request.
     *
     * Update the token's last_used_at timestamp on each authenticated request.
     * Check for inactivity timeout and invalidate expired tokens.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip token activity update for public routes (no authentication required)
        if (str_starts_with($request->path(), 'api/v1/public/')) {
            return $next($request);
        }

        // Only process token activity if user is authenticated
        // This prevents errors when checking authentication status on login page
        try {
            $user = $request->user();
            if (!$user) {
                // No user authenticated, let the auth middleware handle it
                return $next($request);
            }
        } catch (\Exception $e) {
            // If there's an error getting the user, log it but continue
            // The auth middleware will handle authentication
            \Illuminate\Support\Facades\Log::warning('Error getting user in UpdateTokenActivity: ' . $e->getMessage());
            return $next($request);
        }

        // Check token expiration before processing request
        if ($user && $user->currentAccessToken()) {
            try {
                $token = $request->user()->currentAccessToken();
                
                // Get session timeout from settings (in minutes), default to 8 hours (480 minutes)
                // Wrap in try-catch to handle database connection issues gracefully
                try {
                    $sessionTimeoutMinutes = (int) Setting::get('session_timeout', 480);
                } catch (\Exception $e) {
                    // If settings table is unavailable, use default timeout
                    \Illuminate\Support\Facades\Log::warning('Error getting session_timeout from settings: ' . $e->getMessage());
                    $sessionTimeoutMinutes = 480; // Default to 8 hours
                }
                
                // Check if token has expired due to inactivity
                if ($sessionTimeoutMinutes > 0) {
                    // If last_used_at is null, treat it as just created (use created_at)
                    $lastUsedAt = $token->last_used_at ?? $token->created_at;
                    
                    if ($lastUsedAt) {
                        $lastUsed = \Carbon\Carbon::parse($lastUsedAt);
                        $expiresAt = $lastUsed->addMinutes($sessionTimeoutMinutes);
                        
                        // If token has expired due to inactivity, delete it and return 401
                        if (now()->greaterThan($expiresAt)) {
                            $token->delete();
                            
                            return response()->json([
                                'message' => 'Your session has expired due to inactivity. Please login again.',
                            ], 401);
                        }
                    }
                }
            } catch (\Exception $e) {
                // If there's an error checking expiration, log it but continue with request
                // This prevents breaking the app if there's a database issue
                \Illuminate\Support\Facades\Log::warning('Error checking token expiration: ' . $e->getMessage());
            }
        }

        $response = $next($request);

        // Update token last_used_at if user is authenticated via Sanctum
        if ($request->user() && $request->user()->currentAccessToken()) {
            $token = $request->user()->currentAccessToken();
            
            // Update last_used_at timestamp
            $token->forceFill([
                'last_used_at' => now(),
            ])->save();
        }

        return $response;
    }
}

