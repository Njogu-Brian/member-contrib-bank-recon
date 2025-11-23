<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'wallet_id',
        'member_id',
        'amount',
        'source',
        'reference',
        'contributed_at',
        'status',
        'metadata',
    ];

    protected $casts = [
        'contributed_at' => 'date',
        'amount' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }
}

