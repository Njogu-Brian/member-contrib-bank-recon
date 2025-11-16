<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        // Don't cast raw_metadata to array - handle it manually to avoid JSON errors
    ];

    public function getRawMetadataAttribute($value)
    {
        if (is_null($value)) {
            return null;
        }
        
        // If already an array, return it
        if (is_array($value)) {
            return $value;
        }
        
        // Handle JSON string
        if (is_string($value)) {
            $decoded = @json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
            // If JSON is invalid, return null instead of throwing error
            if (json_last_error() !== JSON_ERROR_NONE) {
                \Log::warning("Invalid JSON in raw_metadata for statement {$this->id}: " . json_last_error_msg());
            }
            return null;
        }
        
        return $value;
    }

    public function setRawMetadataAttribute($value)
    {
        if (is_null($value)) {
            $this->attributes['raw_metadata'] = null;
        } elseif (is_array($value)) {
            $this->attributes['raw_metadata'] = json_encode($value);
        } else {
            $this->attributes['raw_metadata'] = $value;
        }
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function duplicates()
    {
        return $this->hasMany(StatementDuplicate::class, 'bank_statement_id');
    }
}

