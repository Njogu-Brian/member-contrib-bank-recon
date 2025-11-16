<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransactionSplit extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'member_id',
        'amount',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    protected static function booted(): void
    {
        static::saved(function (TransactionSplit $split) {
            if (!$split->member_id) {
                return;
            }

            $tranDate = optional($split->transaction)->tran_date;
            if ($tranDate) {
                $split->member?->recordInvestmentDate($tranDate);
            }
        });

        static::deleted(function (TransactionSplit $split) {
            if ($split->member_id) {
                Member::find($split->member_id)?->refreshDateOfRegistration();
            }
        });
    }
}

