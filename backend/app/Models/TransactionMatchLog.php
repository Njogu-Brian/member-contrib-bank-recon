<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransactionMatchLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'member_id',
        'confidence',
        'match_reason',
        'source',
        'user_id',
    ];

    protected $casts = [
        'confidence' => 'decimal:2',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

