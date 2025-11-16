<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditRow extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_run_id',
        'member_id',
        'name',
        'phone',
        'status',
        'expected_total',
        'system_total',
        'difference',
        'mismatched_months',
        'monthly',
        'registration_fee',
        'membership_fee',
    ];

    protected $casts = [
        'expected_total' => 'decimal:2',
        'system_total' => 'decimal:2',
        'difference' => 'decimal:2',
        'registration_fee' => 'decimal:2',
        'membership_fee' => 'decimal:2',
        'mismatched_months' => 'array',
        'monthly' => 'array',
    ];

    public function run()
    {
        return $this->belongsTo(AuditRun::class, 'audit_run_id');
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }
}

