<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditExpenseLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_run_id',
        'audit_row_id',
        'expense_id',
        'type',
    ];

    public function run()
    {
        return $this->belongsTo(AuditRun::class, 'audit_run_id');
    }

    public function row()
    {
        return $this->belongsTo(AuditRow::class, 'audit_row_id');
    }

    public function expense()
    {
        return $this->belongsTo(Expense::class);
    }
}

