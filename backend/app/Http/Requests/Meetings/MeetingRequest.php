<?php

namespace App\Http\Requests\Meetings;

use Illuminate\Foundation\Http\FormRequest;

class MeetingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-meetings') ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'scheduled_for' => ['required', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'agenda_summary' => ['nullable', 'string'],
        ];
    }
}

