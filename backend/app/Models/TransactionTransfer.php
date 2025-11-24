<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class TransactionTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'from_member_id',
        'initiated_by',
        'mode',
        'total_amount',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'total_amount' => 'decimal:2',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function fromMember()
    {
        return $this->belongsTo(Member::class, 'from_member_id');
    }

    public function initiatedBy()
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }

    public function splits()
    {
        return $this->hasMany(TransactionSplit::class, 'transfer_id');
    }
}

