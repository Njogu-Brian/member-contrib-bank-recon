<?php

namespace App\Http\Requests\Payments;

use Illuminate\Foundation\Http\FormRequest;

class MpesaCallbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'transaction_id' => ['required', 'string'],
            'amount' => ['required', 'numeric'],
            'msisdn' => ['required', 'string'],
            'result_code' => ['required', 'string'],
            'result_desc' => ['nullable', 'string'],
            'payload' => ['nullable', 'array'],
        ];
    }
}

