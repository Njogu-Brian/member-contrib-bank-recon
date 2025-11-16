<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatementDuplicate extends Model
{
    protected $fillable = [
        'bank_statement_id',
        'transaction_id',
        'page_number',
        'transaction_code',
        'tran_date',
        'credit',
        'debit',
        'duplicate_reason',
        'particulars_snapshot',
        'metadata',
    ];

    protected $casts = [
        'tran_date' => 'date',
        'credit' => 'decimal:2',
        'debit' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function statement()
    {
        return $this->belongsTo(BankStatement::class, 'bank_statement_id');
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}


