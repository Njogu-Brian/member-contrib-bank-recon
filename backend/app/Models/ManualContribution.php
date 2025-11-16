<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManualContribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'amount',
        'contribution_date',
        'payment_method',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'contribution_date' => 'date',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected static function booted(): void
    {
        static::created(function (ManualContribution $contribution) {
            $contribution->member?->recordInvestmentDate($contribution->contribution_date);
        });

        static::updated(function (ManualContribution $contribution) {
            if ($contribution->wasChanged(['member_id', 'contribution_date'])) {
                $originalMember = $contribution->getOriginal('member_id');
                if ($originalMember && $originalMember !== $contribution->member_id) {
                    Member::find($originalMember)?->refreshDateOfRegistration();
                }
                $contribution->member?->refreshDateOfRegistration();
            }
        });

        static::deleted(function (ManualContribution $contribution) {
            Member::find($contribution->member_id)?->refreshDateOfRegistration();
        });
    }
}

