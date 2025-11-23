<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'description',
        'amount',
        'expense_date',
        'category',
        'notes',
        'assign_to_all_members',
        'amount_per_member',
        'budget_month_id',
        'expense_category_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'assign_to_all_members' => 'boolean',
        'amount_per_member' => 'decimal:2',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function members()
    {
        return $this->belongsToMany(Member::class, 'expense_members')
                    ->withPivot('amount')
                    ->withTimestamps();
    }

    public function budgetMonth()
    {
        return $this->belongsTo(BudgetMonth::class);
    }

    public function expenseCategory()
    {
        return $this->belongsTo(ExpenseCategory::class);
    }
}

