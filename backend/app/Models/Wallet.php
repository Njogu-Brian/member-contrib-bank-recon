<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'balance',
        'locked_balance',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'locked_balance' => 'decimal:2',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function contributions()
    {
        return $this->hasMany(Contribution::class);
    }
}

