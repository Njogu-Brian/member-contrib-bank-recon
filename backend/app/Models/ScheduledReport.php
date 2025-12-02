<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ScheduledReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'report_type',
        'report_params',
        'frequency',
        'recipients',
        'format',
        'last_run_at',
        'next_run_at',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'report_params' => 'array',
        'recipients' => 'array',
        'format' => 'array',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate next run date based on frequency
     */
    public function calculateNextRun(): void
    {
        $now = now();
        
        switch ($this->frequency) {
            case 'daily':
                $this->next_run_at = $now->addDay()->startOfDay();
                break;
            case 'weekly':
                $this->next_run_at = $now->addWeek()->startOfWeek();
                break;
            case 'monthly':
                $this->next_run_at = $now->addMonth()->startOfMonth();
                break;
            case 'quarterly':
                $this->next_run_at = $now->addMonths(3)->startOfQuarter();
                break;
            case 'yearly':
                $this->next_run_at = $now->addYear()->startOfYear();
                break;
            default:
                $this->next_run_at = $now->addDay();
        }
    }
}

