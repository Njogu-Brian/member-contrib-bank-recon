<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_statement_id',
        'tran_date',
        'value_date',
        'particulars',
        'transaction_type',
        'credit',
        'debit',
        'balance',
        'transaction_code',
        'phones',
        'row_hash',
        'member_id',
        'assignment_status',
        'match_confidence',
        'draft_member_ids',
        'raw_text',
        'raw_json',
        'is_archived',
        'archived_at',
        'archive_reason',
    ];

    protected $casts = [
        'tran_date' => 'date',
        'value_date' => 'date',
        'credit' => 'decimal:2',
        'debit' => 'decimal:2',
        'balance' => 'decimal:2',
        'phones' => 'array',
        'match_confidence' => 'decimal:2',
        'draft_member_ids' => 'array',
        'raw_json' => 'array',
        'is_archived' => 'boolean',
        'archived_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saved(function (Transaction $transaction) {
            if (
                !$transaction->member_id ||
                !$transaction->tran_date ||
                $transaction->is_archived ||
                $transaction->assignment_status === 'unassigned'
            ) {
                return;
            }

            $transaction->member?->recordInvestmentDate($transaction->tran_date);
        });
    }

    public function bankStatement()
    {
        return $this->belongsTo(BankStatement::class);
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function matchLogs()
    {
        return $this->hasMany(TransactionMatchLog::class);
    }

    public function splits()
    {
        return $this->hasMany(TransactionSplit::class);
    }

    public function transfers()
    {
        return $this->hasMany(TransactionTransfer::class);
    }

    public function expense()
    {
        return $this->hasOne(Expense::class);
    }
}

