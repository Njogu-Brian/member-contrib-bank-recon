<?php

namespace App\Services;

use App\Models\Announcement;
use Illuminate\Database\Eloquent\Collection;

class AnnouncementService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function list(): Collection
    {
        return Announcement::orderByDesc('published_at')
            ->orderByDesc('is_pinned')
            ->get();
    }

    public function create(array $data, int $userId): Announcement
    {
        $announcement = Announcement::create([
            'user_id' => $userId,
            'title' => $data['title'],
            'body' => $data['body'],
            'published_at' => $data['published_at'] ?? now(),
            'is_pinned' => $data['is_pinned'] ?? false,
        ]);

        $this->auditLogger->log($userId, 'announcement.created', $announcement, $data);

        return $announcement;
    }

    public function update(Announcement $announcement, array $data, int $userId): Announcement
    {
        $announcement->update($data);
        $this->auditLogger->log($userId, 'announcement.updated', $announcement, $data);

        return $announcement;
    }

    public function delete(Announcement $announcement, int $userId): void
    {
        $announcement->delete();
        $this->auditLogger->log($userId, 'announcement.deleted', $announcement);
    }
}

