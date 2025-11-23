<?php

namespace App\Http\Requests\Investments;

use Illuminate\Foundation\Http\FormRequest;

class InvestmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-investments') ?? false;
    }

    public function rules(): array
    {
        return [
            'member_id' => ['required', 'exists:members,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'principal_amount' => ['required', 'numeric', 'min:0'],
            'expected_roi_rate' => ['required', 'numeric', 'between:0,100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:active,completed,cancelled,on_hold'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}

