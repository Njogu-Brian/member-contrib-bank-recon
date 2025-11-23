<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingAgenda extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'topic',
        'details',
        'order',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }
}

