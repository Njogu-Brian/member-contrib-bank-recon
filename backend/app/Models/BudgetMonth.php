<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetMonth extends Model
{
    use HasFactory;

    protected $fillable = [
        'budget_id',
        'month',
        'planned_amount',
        'actual_amount',
    ];

    protected $casts = [
        'planned_amount' => 'decimal:2',
        'actual_amount' => 'decimal:2',
    ];

    public function budget()
    {
        return $this->belongsTo(Budget::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}

