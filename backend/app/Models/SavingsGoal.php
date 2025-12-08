<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavingsGoal extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'name',
        'description',
        'target_amount',
        'current_amount',
        'target_date',
        'start_date',
        'status',
        'monthly_contribution',
        'metadata',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'current_amount' => 'decimal:2',
        'monthly_contribution' => 'decimal:2',
        'target_date' => 'date',
        'start_date' => 'date',
        'metadata' => 'array',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function getProgressPercentageAttribute(): float
    {
        if ($this->target_amount <= 0) {
            return 0;
        }
        return min(100, ($this->current_amount / $this->target_amount) * 100);
    }

    public function getRemainingAmountAttribute(): float
    {
        return max(0, $this->target_amount - $this->current_amount);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed' || $this->current_amount >= $this->target_amount;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function addContribution(float $amount): void
    {
        $this->current_amount = min($this->target_amount, $this->current_amount + $amount);
        
        if ($this->current_amount >= $this->target_amount) {
            $this->status = 'completed';
        }
        
        $this->save();
    }
}

