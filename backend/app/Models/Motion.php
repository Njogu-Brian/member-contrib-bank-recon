<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Motion extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'proposed_by',
        'title',
        'description',
        'status',
    ];

    public function meeting()
    {
        return $this->belongsTo(Meeting::class);
    }

    public function proposer()
    {
        return $this->belongsTo(User::class, 'proposed_by');
    }

    public function votes()
    {
        return $this->hasMany(Vote::class);
    }
}

