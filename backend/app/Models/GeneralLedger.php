<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeneralLedger extends Model
{
    use HasFactory;

    protected $table = 'general_ledger';

    protected $fillable = [
        'account_id',
        'journal_entry_id',
        'period_id',
        'entry_date',
        'debit',
        'credit',
        'running_balance',
        'reference_type',
        'reference_id',
        'description',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'running_balance' => 'decimal:2',
    ];

    public function account()
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function period()
    {
        return $this->belongsTo(AccountingPeriod::class, 'period_id');
    }
}

