<?php

namespace App\Http\Requests\Budgets;

use Illuminate\Foundation\Http\FormRequest;

class BudgetMonthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-budget') ?? false;
    }

    public function rules(): array
    {
        return [
            'planned_amount' => ['nullable', 'numeric', 'min:0'],
            'actual_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}

