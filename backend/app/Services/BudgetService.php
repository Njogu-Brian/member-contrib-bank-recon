<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\BudgetMonth;
use Illuminate\Database\Eloquent\Collection;

class BudgetService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function list(): Collection
    {
        return Budget::with('months')->orderByDesc('year')->get();
    }

    public function create(array $data, int $userId): Budget
    {
        $budget = Budget::create($data);

        // seed 12 months
        for ($month = 1; $month <= 12; $month++) {
            $budget->months()->create([
                'month' => $month,
                'planned_amount' => round($data['total_amount'] / 12, 2),
            ]);
        }

        $this->auditLogger->log($userId, 'budget.created', $budget, $data);

        return $budget->fresh('months');
    }

    public function updateMonth(BudgetMonth $month, array $data, int $userId): BudgetMonth
    {
        $month->update($data);
        $this->auditLogger->log($userId, 'budget.month_updated', $month, $data);

        return $month;
    }
}

