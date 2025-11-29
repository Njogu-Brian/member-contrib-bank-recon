<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'period_id',
        'opening_balance',
        'total_debit',
        'total_credit',
        'closing_balance',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'total_debit' => 'decimal:2',
        'total_credit' => 'decimal:2',
        'closing_balance' => 'decimal:2',
    ];

    public function account()
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    public function period()
    {
        return $this->belongsTo(AccountingPeriod::class, 'period_id');
    }
}

