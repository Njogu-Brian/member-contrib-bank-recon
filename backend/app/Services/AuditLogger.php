<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    public function log(?int $userId, string $action, ?object $model = null, array $changes = []): void
    {
        AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'auditable_type' => $model ? get_class($model) : null,
            'auditable_id' => $model?->getKey(),
            'changes' => $changes,
            'ip_address' => Request::ip(),
            'user_agent' => Request::header('User-Agent'),
        ]);
    }
}

