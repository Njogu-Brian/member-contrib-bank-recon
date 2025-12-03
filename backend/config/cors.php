<?php

return (function () {
    $defaultOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:19006',
        'http://localhost:8081',
    ];

    $envOrigins = array_filter(array_map('trim', explode(',', env('FRONTEND_URLS', env('FRONTEND_URL', '')))));
    $allowedOrigins = !empty($envOrigins) ? $envOrigins : $defaultOrigins;

    return [
        'paths' => ['api/*', 'sanctum/csrf-cookie'],

        'allowed_methods' => ['*'],

        'allowed_origins' => $allowedOrigins,

        'allowed_origins_patterns' => [],

        'allowed_headers' => ['*'],

        'exposed_headers' => [],

        'max_age' => 0,

        'supports_credentials' => true,
    ];
})();


