<?php

namespace App\Services;

use App\Models\NotificationLog;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class NotificationService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function preferences(User $user): NotificationPreference
    {
        return $user->notificationPreference()->firstOrCreate([]);
    }

    public function updatePreferences(User $user, array $data): NotificationPreference
    {
        $prefs = $this->preferences($user);
        $prefs->update($data);
        $this->auditLogger->log($user->id, 'notification.preferences_updated', $prefs, $data);

        return $prefs;
    }

    public function log(User $user, string $type, string $channel, array $payload = [], string $status = 'queued'): NotificationLog
    {
        return NotificationLog::create([
            'user_id' => $user->id,
            'type' => $type,
            'channel' => $channel,
            'payload' => $payload,
            'status' => $status,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);
    }

    public function getLog(User $user): Collection
    {
        return NotificationLog::where('user_id', $user->id)->latest()->limit(50)->get();
    }
}

