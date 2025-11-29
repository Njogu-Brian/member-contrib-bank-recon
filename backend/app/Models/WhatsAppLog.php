<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsAppLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'phone',
        'message',
        'status',
        'sent_at',
        'response',
        'error_message',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'response' => 'array',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }
}

