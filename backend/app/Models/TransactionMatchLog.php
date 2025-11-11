<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionMatchLog extends Model
{
    use HasFactory;

    protected $table = 'transaction_matches_log';

    protected $fillable = [
        'transaction_id',
        'member_id',
        'confidence',
        'match_tokens',
        'match_reason',
        'source',
        'user_id',
    ];

    protected $casts = [
        'confidence' => 'decimal:2',
        'match_tokens' => 'array',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

