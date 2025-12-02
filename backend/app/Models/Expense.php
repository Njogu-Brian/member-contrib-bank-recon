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
        'approval_status',
        'requested_by',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'rejected_by',
        'rejected_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'assign_to_all_members' => 'boolean',
        'amount_per_member' => 'decimal:2',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
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
    
    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
    
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
    
    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }
    
    public function isPending(): bool
    {
        return $this->approval_status === 'pending';
    }
    
    public function isApproved(): bool
    {
        return $this->approval_status === 'approved';
    }
    
    public function isRejected(): bool
    {
        return $this->approval_status === 'rejected';
    }
}


