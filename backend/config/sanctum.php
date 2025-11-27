<?php

return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,localhost:5173,127.0.0.1,127.0.0.1:8000,::1',
        env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
    ))),
    'guard' => ['web'],
    // Token expiration in minutes (null = never expire, but we handle expiration via middleware)
    // Default to 8 hours (480 minutes) - can be overridden via SANCTUM_TOKEN_EXPIRATION env var
    // Or set via session_timeout setting (handled in middleware)
    'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 480) ? (int) env('SANCTUM_TOKEN_EXPIRATION') * 60 : null,
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),
    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
    ],
];

