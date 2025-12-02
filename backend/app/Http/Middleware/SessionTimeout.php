<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SessionTimeout
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $timeout = config('session.lifetime') * 60; // Convert minutes to seconds
            $lastActivity = session('last_activity_time');
            
            if ($lastActivity && (time() - $lastActivity) > $timeout) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                
                return response()->json([
                    'message' => 'Your session has expired due to inactivity. Please log in again.',
                ], 401);
            }
            
            session(['last_activity_time' => time()]);
        }
        
        return $next($request);
    }
}

