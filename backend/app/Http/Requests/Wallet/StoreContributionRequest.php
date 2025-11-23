<?php

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class StoreContributionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-wallets') ?? false;
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:1'],
            'source' => ['required', 'in:manual,mpesa,bank'],
            'reference' => ['nullable', 'string', 'max:255'],
            'contributed_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}

