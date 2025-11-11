<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_statement_id',
        'tran_date',
        'value_date',
        'particulars',
        'credit',
        'debit',
        'balance',
        'transaction_code',
        'phones',
        'row_hash',
        'member_id',
        'assignment_status',
        'match_confidence',
        'raw_text',
        'raw_json',
    ];

    protected $casts = [
        'tran_date' => 'date',
        'value_date' => 'date',
        'credit' => 'decimal:2',
        'debit' => 'decimal:2',
        'balance' => 'decimal:2',
        'phones' => 'array',
        'match_confidence' => 'decimal:2',
        'raw_json' => 'array',
    ];

    public function bankStatement(): BelongsTo
    {
        return $this->belongsTo(BankStatement::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function matchLogs(): HasMany
    {
        return $this->hasMany(TransactionMatchLog::class);
    }
}

