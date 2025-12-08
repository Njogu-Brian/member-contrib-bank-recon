<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ExpenseApprovalService
{
    /**
     * Check if user can approve an expense based on hierarchy
     */
    public function canApprove(Expense $expense, User $user): array
    {
        $result = [
            'can_approve' => false,
            'reason' => null,
            'required_role' => null,
        ];

        // Validate expense amount
        if ($expense->amount <= 0) {
            $result['reason'] = 'Invalid expense amount';
            return $result;
        }

        // Admin can always approve
        if ($user->hasRole('admin') || $user->hasRole('super_admin')) {
            $result['can_approve'] = true;
            return $result;
        }

        // Get approval threshold from settings or use defaults
        $treasurerThreshold = \App\Models\Setting::get('expense_approval_treasurer_threshold', 50000); // 50,000 KES
        $groupLeaderThreshold = \App\Models\Setting::get('expense_approval_group_leader_threshold', 10000); // 10,000 KES

        $amount = (float) $expense->amount;

        // Expenses above treasurer threshold require admin or treasurer
        if ($amount > $treasurerThreshold) {
            if ($user->hasRole('treasurer')) {
                $result['can_approve'] = true;
            } else {
                $result['can_approve'] = false;
                $result['reason'] = "Expenses above {$treasurerThreshold} KES require Treasurer or Admin approval";
                $result['required_role'] = 'treasurer';
            }
            return $result;
        }

        // Expenses above group leader threshold require treasurer or group leader
        if ($amount > $groupLeaderThreshold) {
            if ($user->hasRole('treasurer') || $user->hasRole('group_leader')) {
                $result['can_approve'] = true;
            } else {
                $result['can_approve'] = false;
                $result['reason'] = "Expenses above {$groupLeaderThreshold} KES require Group Leader, Treasurer, or Admin approval";
                $result['required_role'] = 'group_leader';
            }
            return $result;
        }

        // Small expenses can be approved by group leader or treasurer
        if ($user->hasRole('group_leader') || $user->hasRole('treasurer')) {
            $result['can_approve'] = true;
        } else {
            $result['can_approve'] = false;
            $result['reason'] = "You do not have permission to approve expenses. Required role: Group Leader, Treasurer, or Admin";
            $result['required_role'] = 'group_leader';
        }

        return $result;
    }

    /**
     * Get approval hierarchy information
     */
    public function getApprovalHierarchy(): array
    {
        $treasurerThreshold = \App\Models\Setting::get('expense_approval_treasurer_threshold', 50000);
        $groupLeaderThreshold = \App\Models\Setting::get('expense_approval_group_leader_threshold', 10000);

        return [
            'hierarchy' => [
                [
                    'amount_range' => "0 - {$groupLeaderThreshold} KES",
                    'can_approve' => ['Group Leader', 'Treasurer', 'Admin'],
                ],
                [
                    'amount_range' => "{$groupLeaderThreshold} - {$treasurerThreshold} KES",
                    'can_approve' => ['Treasurer', 'Admin'],
                ],
                [
                    'amount_range' => "Above {$treasurerThreshold} KES",
                    'can_approve' => ['Treasurer', 'Admin'],
                ],
            ],
            'thresholds' => [
                'group_leader' => $groupLeaderThreshold,
                'treasurer' => $treasurerThreshold,
            ],
        ];
    }
}

