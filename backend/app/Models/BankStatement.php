<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankStatement extends Model
{
    use HasFactory;

    protected $fillable = [
        'filename',
        'file_path',
        'file_hash',
        'statement_date',
        'account_number',
        'status',
        'error_message',
        'raw_metadata',
    ];

    protected $casts = [
        'statement_date' => 'date',
        'raw_metadata' => 'array',
    ];

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}

