<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountingPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_name',
        'start_date',
        'end_date',
        'is_closed',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_closed' => 'boolean',
        'closed_at' => 'datetime',
    ];

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function journalEntries()
    {
        return $this->hasMany(JournalEntry::class, 'period_id');
    }

    public function generalLedgerEntries()
    {
        return $this->hasMany(GeneralLedger::class, 'period_id');
    }

    public function accountBalances()
    {
        return $this->hasMany(AccountBalance::class, 'period_id');
    }

    public function isCurrent(): bool
    {
        return now()->between($this->start_date, $this->end_date) && !$this->is_closed;
    }
}

