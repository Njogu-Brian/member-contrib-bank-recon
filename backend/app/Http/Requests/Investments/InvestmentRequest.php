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
            'principal_amount' => ['required', 'numeric', 'min:1', 'max:999999999.99'],
            'expected_roi_rate' => ['required', 'numeric', 'between:0,100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:active,completed,cancelled,on_hold'],
            'metadata' => ['nullable', 'array'],
        ];
    }
    
    public function messages(): array
    {
        return [
            'principal_amount.min' => 'Investment amount must be at least 1 KES',
            'principal_amount.max' => 'Investment amount cannot exceed 999,999,999.99 KES',
        ];
    }
}

