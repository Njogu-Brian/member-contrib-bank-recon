<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvestmentPayout extends Model
{
    use HasFactory;

    protected $fillable = [
        'investment_id',
        'amount',
        'scheduled_for',
        'paid_at',
        'status',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'scheduled_for' => 'date',
        'paid_at' => 'date',
        'metadata' => 'array',
    ];

    public function investment()
    {
        return $this->belongsTo(Investment::class);
    }
}

