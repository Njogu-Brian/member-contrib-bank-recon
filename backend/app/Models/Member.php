<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Models\ContributionStatusRule;
use App\Models\Setting;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'secondary_phone',
        'email',
        'id_number',
        'church',
        'gender',
        'next_of_kin_name',
        'next_of_kin_phone',
        'next_of_kin_relationship',
        'member_code',
        'member_number',
        'date_of_registration',
        'notes',
        'is_active',
        'public_share_token',
        'public_share_token_expires_at',
        'public_share_last_accessed_at',
        'public_share_access_count',
        'kyc_status',
        'kyc_approved_at',
        'kyc_approved_by',
        'kyc_rejection_reason',
        'activated_at',
        'activated_by',
        'profile_completed_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'date_of_registration' => 'date',
        'kyc_approved_at' => 'datetime',
        'activated_at' => 'datetime',
        'profile_completed_at' => 'datetime',
    ];

    protected $appends = [
        'contribution_status_label',
        'contribution_status_color',
    ];

    protected ?ContributionStatusRule $statusRuleCache = null;

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function manualContributions()
    {
        return $this->hasMany(ManualContribution::class);
    }

    public function transactionSplits()
    {
        return $this->hasMany(TransactionSplit::class);
    }

    public function expenses()
    {
        return $this->belongsToMany(Expense::class, 'expense_members')
                    ->withPivot('amount')
                    ->withTimestamps();
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function kycDocuments()
    {
        return $this->hasMany(KycDocument::class);
    }

    public function kycApprovedBy()
    {
        return $this->belongsTo(User::class, 'kyc_approved_by');
    }

    public function activatedByUser()
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    public function isKycApproved(): bool
    {
        return $this->kyc_status === 'approved';
    }

    public function isKycPending(): bool
    {
        return $this->kyc_status === 'pending';
    }

    public function isKycRejected(): bool
    {
        return $this->kyc_status === 'rejected';
    }

    public function isActivated(): bool
    {
        return $this->is_active && $this->activated_at !== null;
    }

    public function getTotalContributionsAttribute()
    {
        $manual = $this->manualContributions()->sum('amount');

        $baseTransactions = DB::table('transactions')
            ->leftJoin('transaction_splits', 'transactions.id', '=', 'transaction_splits.transaction_id')
            ->select(
                'transactions.id',
                DB::raw('transactions.credit as credit'),
                DB::raw('COALESCE(SUM(transaction_splits.amount), 0) as distributed')
            )
            ->where('transactions.member_id', $this->id)
            ->whereNotIn('transactions.assignment_status', ['unassigned', 'duplicate'])
            ->where('transactions.is_archived', false)
            ->groupBy('transactions.id', 'transactions.credit')
            ->get()
            ->sum(function ($row) {
                $remainder = (float) $row->credit - (float) $row->distributed;
                return $remainder > 0 ? $remainder : 0;
            });

        $splitShare = $this->transactionSplits()->sum('amount');

        return $manual + $baseTransactions + $splitShare;
    }

    public function getExpectedContributionsAttribute()
    {
        // Expected contributions = Total invoices issued for this member
        // This merges the invoice and expected contributions modules into one
        // Invoices represent what the member should have paid
        return $this->invoices()->sum('amount');
    }

    protected function resolveContributionStatusRule(): ?ContributionStatusRule
    {
        if ($this->statusRuleCache !== null) {
            return $this->statusRuleCache;
        }

        $expected = (float) $this->expected_contributions;
        $actual = (float) $this->total_contributions;

        $this->statusRuleCache = ContributionStatusRule::resolveForTotals($actual, $expected);

        return $this->statusRuleCache;
    }

    public function getContributionStatusAttribute(): string
    {
        return $this->resolveContributionStatusRule()->slug ?? 'unknown';
    }

    public function getContributionStatusLabelAttribute(): ?string
    {
        return $this->resolveContributionStatusRule()->name ?? null;
    }

    public function getContributionStatusColorAttribute(): ?string
    {
        return $this->resolveContributionStatusRule()->color ?? '#6b7280';
    }

    public function recordInvestmentDate($date): void
    {
        if (!$date) {
            return;
        }

        $parsed = $date instanceof Carbon ? $date->copy() : Carbon::parse($date);
        $parsed->startOfDay();

        $current = $this->date_of_registration;
        if (!$current || $parsed->lt($current)) {
            $this->forceFill(['date_of_registration' => $parsed->toDateString()])->saveQuietly();
        }
    }

    public function refreshDateOfRegistration(): ?Carbon
    {
        $computed = $this->computeFirstInvestmentDate();

        if ($computed && (!$this->date_of_registration || $computed->lt($this->date_of_registration))) {
            $this->forceFill(['date_of_registration' => $computed->toDateString()])->saveQuietly();
            return $computed;
        }

        if (!$computed && $this->date_of_registration) {
            $this->forceFill(['date_of_registration' => null])->saveQuietly();
        }

        return $computed ?? $this->date_of_registration;
    }

    protected function computeFirstInvestmentDate(): ?Carbon
    {
        $dates = [];

        $transactionDate = DB::table('transactions')
            ->where('member_id', $this->id)
            ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
            ->where('is_archived', false)
            ->min('tran_date');
        if ($transactionDate) {
            $dates[] = Carbon::parse($transactionDate);
        }

        $manualDate = DB::table('manual_contributions')
            ->where('member_id', $this->id)
            ->min('contribution_date');
        if ($manualDate) {
            $dates[] = Carbon::parse($manualDate);
        }

        $splitDate = DB::table('transaction_splits')
            ->join('transactions', 'transaction_splits.transaction_id', '=', 'transactions.id')
            ->where('transaction_splits.member_id', $this->id)
            ->where('transactions.is_archived', false)
            ->min('transactions.tran_date');
        if ($splitDate) {
            $dates[] = Carbon::parse($splitDate);
        }

        if (empty($dates)) {
            return null;
        }

        return collect($dates)->sort()->first();
    }

    /**
     * Get or generate public share token for this member
     */
    public function getPublicShareToken(): string
    {
        if (!$this->public_share_token) {
            $this->public_share_token = $this->generateUniqueToken();
            $this->saveQuietly();
        }

        return $this->public_share_token;
    }

    /**
     * Generate a unique public share token
     */
    protected function generateUniqueToken(): string
    {
        do {
            $token = \Illuminate\Support\Str::random(32);
        } while (static::where('public_share_token', $token)->exists());

        return $token;
    }

    /**
     * Check if member profile is complete
     * Required fields: name, phone, email, id_number, church
     */
    public function isProfileComplete(): bool
    {
        return !empty($this->name) &&
               !empty($this->phone) &&
               !empty($this->email) &&
               !empty($this->id_number) &&
               !empty($this->church);
    }

    /**
     * Get list of missing profile fields
     */
    public function getMissingProfileFields(): array
    {
        $missing = [];
        
        if (empty($this->name)) $missing[] = 'name';
        if (empty($this->phone)) $missing[] = 'phone';
        if (empty($this->email)) $missing[] = 'email';
        if (empty($this->id_number)) $missing[] = 'id_number';
        if (empty($this->church)) $missing[] = 'church';
        
        return $missing;
    }

    /**
     * Mark profile as completed
     */
    public function markProfileComplete(): void
    {
        if ($this->isProfileComplete() && !$this->profile_completed_at) {
            $this->profile_completed_at = now();
            $this->saveQuietly();
        }
    }
}

