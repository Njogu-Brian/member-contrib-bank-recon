<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'year',
        'original_filename',
        'stored_filename',
        'file_path',
        'summary',
        'metadata',
    ];

    protected $casts = [
        'summary' => 'array',
        'metadata' => 'array',
    ];

    public function rows()
    {
        return $this->hasMany(AuditRow::class);
    }

    public function expenses()
    {
        return $this->hasMany(AuditExpenseLink::class);
    }
}

