<?php

namespace App\Services;

use App\Models\Meeting;
use App\Models\Motion;
use App\Models\Vote;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class MeetingService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function list(): Collection
    {
        return Meeting::with(['motions.votes'])->orderByDesc('scheduled_for')->get();
    }

    public function create(array $data, int $userId): Meeting
    {
        $meeting = Meeting::create($data);
        $this->auditLogger->log($userId, 'meeting.created', $meeting, $data);

        return $meeting;
    }

    public function addMotion(Meeting $meeting, array $data, int $userId): Motion
    {
        $motion = $meeting->motions()->create([
            'proposed_by' => $userId,
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => 'open',
        ]);

        $this->auditLogger->log($userId, 'meeting.motion_created', $motion, $data);

        return $motion;
    }

    public function castVote(Motion $motion, int $userId, string $choice): Vote
    {
        return DB::transaction(function () use ($motion, $userId, $choice) {
            $vote = $motion->votes()->updateOrCreate(
                ['user_id' => $userId],
                ['choice' => $choice]
            );

            $this->auditLogger->log($userId, 'meeting.vote_cast', $vote, ['choice' => $choice]);

            return $vote;
        });
    }
}

