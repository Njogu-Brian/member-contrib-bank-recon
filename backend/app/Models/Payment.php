<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'contribution_id',
        'member_id',
        'channel',
        'provider_reference',
        'amount',
        'currency',
        'status',
        'payload',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payload' => 'array',
    ];

    public function contribution()
    {
        return $this->belongsTo(Contribution::class);
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function receipt()
    {
        return $this->hasOne(PaymentReceipt::class);
    }
}

