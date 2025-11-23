<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoiCalculation extends Model
{
    use HasFactory;

    protected $fillable = [
        'investment_id',
        'principal',
        'accrued_interest',
        'calculated_on',
        'inputs',
    ];

    protected $casts = [
        'principal' => 'decimal:2',
        'accrued_interest' => 'decimal:2',
        'calculated_on' => 'date',
        'inputs' => 'array',
    ];

    public function investment()
    {
        return $this->belongsTo(Investment::class);
    }
}

