<?php

namespace App\Http\Requests\Payments;

use Illuminate\Foundation\Http\FormRequest;

class PaymentReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-payments') ?? false;
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}

