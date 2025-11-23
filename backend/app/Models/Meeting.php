<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Meeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'agenda_summary',
        'scheduled_for',
        'location',
        'status',
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
    ];

    public function agendas()
    {
        return $this->hasMany(MeetingAgenda::class);
    }

    public function motions()
    {
        return $this->hasMany(Motion::class);
    }
}

