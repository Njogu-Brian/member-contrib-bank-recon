<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vote extends Model
{
    use HasFactory;

    protected $fillable = [
        'motion_id',
        'user_id',
        'choice',
    ];

    public function motion()
    {
        return $this->belongsTo(Motion::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

