<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'kyc_status',
        'current_step',
        'national_id',
        'phone',
        'address',
        'date_of_birth',
        'metadata',
        'kyc_verified_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'kyc_verified_at' => 'datetime',
        'date_of_birth' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

