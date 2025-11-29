<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MpesaReconciliationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'transaction_id',
        'status',
        'reconciled_at',
        'reconciled_by',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'reconciled_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function reconciledBy()
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isMatched(): bool
    {
        return $this->status === 'matched';
    }

    public function isUnmatched(): bool
    {
        return $this->status === 'unmatched';
    }

    public function isDuplicate(): bool
    {
        return $this->status === 'duplicate';
    }
}

