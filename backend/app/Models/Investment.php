<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Investment extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'name',
        'description',
        'principal_amount',
        'expected_roi_rate',
        'start_date',
        'end_date',
        'status',
        'metadata',
    ];

    protected $casts = [
        'principal_amount' => 'decimal:2',
        'expected_roi_rate' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'metadata' => 'array',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function payouts()
    {
        return $this->hasMany(InvestmentPayout::class);
    }

    public function roiCalculations()
    {
        return $this->hasMany(RoiCalculation::class);
    }
}

