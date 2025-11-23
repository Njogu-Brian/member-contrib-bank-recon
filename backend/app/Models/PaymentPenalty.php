<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentPenalty extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'contribution_id',
        'amount',
        'reason',
        'due_date',
        'resolved_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'resolved_at' => 'date',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function contribution()
    {
        return $this->belongsTo(Contribution::class);
    }
}

