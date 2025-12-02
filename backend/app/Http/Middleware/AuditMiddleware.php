<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditMiddleware
{
    public function __construct(
        private readonly AuditLogger $auditLogger
    ) {
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only audit authenticated requests
        if (!auth()->check()) {
            return $response;
        }

        $user = auth()->user();
        $method = $request->method();
        $path = $request->path();

        // Skip GET requests (except important ones)
        if ($method === 'GET' && !$this->shouldAuditGetRequest($path)) {
            return $response;
        }

        // Determine action type
        $action = $this->determineAction($method, $path);

        // Skip if action is not auditable
        if (!$action) {
            return $response;
        }

        // Get model data if available
        $modelData = $this->extractModelData($request, $response);

        // Log the audit
        try {
            $this->auditLogger->log(
                $user->id,
                $action,
                $modelData['model'] ?? null,
                array_merge(
                    [
                        'method' => $method,
                        'path' => $path,
                        'ip' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                    ],
                    $modelData['attributes'] ?? []
                )
            );
        } catch (\Exception $e) {
            // Log error but don't break the request
            \Log::error('Audit logging failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'action' => $action,
            ]);
        }

        return $response;
    }

    /**
     * Determine if GET request should be audited
     */
    protected function shouldAuditGetRequest(string $path): bool
    {
        $auditableGetPaths = [
            'admin/statements/export',
            'admin/members/export',
            'admin/reports/download',
            'admin/settings',
        ];

        return in_array($path, $auditableGetPaths);
    }

    /**
     * Determine action type from method and path
     */
    protected function determineAction(string $method, string $path): ?string
    {
        // Map HTTP methods to actions
        $actionMap = [
            'POST' => 'create',
            'PUT' => 'update',
            'PATCH' => 'update',
            'DELETE' => 'delete',
        ];

        $baseAction = $actionMap[$method] ?? null;

        if (!$baseAction) {
            return null;
        }

        // Extract resource from path
        if (preg_match('/\/admin\/([^\/]+)/', $path, $matches)) {
            $resource = str_replace('-', '_', $matches[1]);
            return "{$resource}.{$baseAction}";
        }

        return $baseAction;
    }

    /**
     * Extract model data from request/response
     */
    protected function extractModelData(Request $request, Response $response): array
    {
        $data = ['model' => null, 'attributes' => []];

        // Try to get model from route parameters
        $route = $request->route();
        if ($route) {
            $parameters = $route->parameters();
            foreach ($parameters as $param) {
                if (is_object($param) && method_exists($param, 'getTable')) {
                    $data['model'] = $param;
                    break;
                }
            }
        }

        // Get request data (sanitized)
        $requestData = $request->except(['password', 'password_confirmation', '_token', 'api_token']);
        if (!empty($requestData)) {
            $data['attributes'] = array_merge($data['attributes'] ?? [], [
                'request_data' => $this->sanitizeData($requestData),
            ]);
        }

        // For successful responses, include response data
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            $content = $response->getContent();
            if ($content) {
                $json = json_decode($content, true);
                if (is_array($json) && isset($json['data'])) {
                    $data['attributes']['response_id'] = $json['data']['id'] ?? null;
                }
            }
        }

        return $data;
    }

    /**
     * Sanitize sensitive data
     */
    protected function sanitizeData(array $data): array
    {
        $sensitiveKeys = ['password', 'token', 'secret', 'key', 'api_key', 'access_token'];

        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys)) {
                $data[$key] = '***REDACTED***';
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitizeData($value);
            }
        }

        return $data;
    }
}

