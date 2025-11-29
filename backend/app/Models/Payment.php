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
        'mpesa_transaction_id',
        'mpesa_receipt_number',
        'amount',
        'currency',
        'status',
        'reconciliation_status',
        'reconciled_at',
        'reconciled_by',
        'payload',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payload' => 'array',
        'reconciled_at' => 'datetime',
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

    public function reconciliationLogs()
    {
        return $this->hasMany(MpesaReconciliationLog::class);
    }

    public function reconciledBy()
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }

    public function isReconciled(): bool
    {
        return $this->reconciliation_status === 'reconciled';
    }

    public function isPendingReconciliation(): bool
    {
        return $this->reconciliation_status === 'pending';
    }

    public function isDuplicate(): bool
    {
        return $this->reconciliation_status === 'duplicate';
    }
}

