<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API requests, return null to get JSON response instead of redirect
        if ($request->expectsJson() || $request->is('api/*') || str_starts_with($request->path(), 'api/')) {
            return null;
        }
        
        // For web requests, return null (no web login route exists in this API-only app)
        return null;
    }
}

