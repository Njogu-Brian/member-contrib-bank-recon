<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\ContributionStatusRule;
use App\Models\Setting;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'whatsapp_number',
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
        'registration_requested_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'date_of_registration' => 'date',
        'kyc_approved_at' => 'datetime',
        'activated_at' => 'datetime',
        'profile_completed_at' => 'datetime',
        'registration_requested_at' => 'datetime',
        'public_share_token_expires_at' => 'datetime',
        'public_share_last_accessed_at' => 'datetime',
    ];

    protected $appends = [
        'contribution_status_label',
        'contribution_status_color',
    ];

    protected ?ContributionStatusRule $statusRuleCache = null;

    protected static function booted(): void
    {
        // Invalid MySQL dates (e.g. 0000-00-00) or corrupt strings break date/datetime casts during JSON serialization.
        static::retrieved(function (Member $member) {
            $dateCols = ['date_of_registration'];
            $dateTimeCols = [
                'kyc_approved_at',
                'activated_at',
                'profile_completed_at',
                'registration_requested_at',
                'public_share_token_expires_at',
                'public_share_last_accessed_at',
            ];

            foreach ($dateCols as $col) {
                $member->sanitizeInvalidDateColumn($col, true);
            }
            foreach ($dateTimeCols as $col) {
                $member->sanitizeInvalidDateColumn($col, false);
            }
        });
    }

    /**
     * Clear invalid date values so casts and JSON encoding do not throw.
     */
    protected function sanitizeInvalidDateColumn(string $column, bool $dateOnly): void
    {
        if (! array_key_exists($column, $this->attributes)) {
            return;
        }

        $v = $this->attributes[$column];
        if ($v === null || $v === '') {
            return;
        }

        if (is_string($v) && preg_match('/^0000-00-00/', $v)) {
            Log::warning('Member invalid date cleared', ['member_id' => $this->id, 'column' => $column]);
            $this->attributes[$column] = null;

            return;
        }

        try {
            Carbon::parse($v);
        } catch (\Throwable $e) {
            Log::warning('Member unparseable date cleared', [
                'member_id' => $this->id,
                'column' => $column,
                'value' => is_string($v) ? substr($v, 0, 32) : '[non-string]',
            ]);
            $this->attributes[$column] = null;
        }
    }

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
        try {
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
        } catch (\Throwable $e) {
            Log::warning('Member total_contributions calculation failed', [
                'member_id' => $this->id,
                'error' => $e->getMessage(),
            ]);

            return 0.0;
        }
    }

    public function getExpectedContributionsAttribute()
    {
        try {
            // Expected contributions = Total invoices issued for this member
            return $this->invoices()->sum('amount');
        } catch (\Throwable $e) {
            Log::warning('Member expected_contributions calculation failed', [
                'member_id' => $this->id,
                'error' => $e->getMessage(),
            ]);

            return 0.0;
        }
    }

    protected function resolveContributionStatusRule(): ?ContributionStatusRule
    {
        if ($this->statusRuleCache !== null) {
            return $this->statusRuleCache;
        }

        try {
            $expected = (float) $this->expected_contributions;
            $actual = (float) $this->total_contributions;

            $this->statusRuleCache = ContributionStatusRule::resolveForTotals($actual, $expected);

            return $this->statusRuleCache;
        } catch (\Throwable $e) {
            Log::warning('Member contribution status rule resolution failed', [
                'member_id' => $this->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function getContributionStatusAttribute(): string
    {
        $rule = $this->resolveContributionStatusRule();
        return $rule?->slug ?? 'unknown';
    }

    public function getContributionStatusLabelAttribute(): ?string
    {
        $rule = $this->resolveContributionStatusRule();
        return $rule?->name ?? null;
    }

    public function getContributionStatusColorAttribute(): ?string
    {
        $rule = $this->resolveContributionStatusRule();
        return $rule?->color ?? '#6b7280';
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
     * Required fields: name, phone, email, id_number, church, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
     */
    public function isProfileComplete(): bool
    {
        return !empty($this->name) &&
               !empty($this->phone) &&
               !empty($this->email) &&
               !empty($this->id_number) &&
               !empty($this->church) &&
               !empty($this->next_of_kin_name) &&
               !empty($this->next_of_kin_phone) &&
               !empty($this->next_of_kin_relationship);
    }

    /**
     * Check if member profile is complete including pending changes
     * This allows members to access their statement even if admin hasn't approved changes yet
     */
    public function isProfileCompleteWithPending(): bool
    {
        // Get current values
        $values = [
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'id_number' => $this->id_number,
            'church' => $this->church,
            'next_of_kin_name' => $this->next_of_kin_name,
            'next_of_kin_phone' => $this->next_of_kin_phone,
            'next_of_kin_relationship' => $this->next_of_kin_relationship,
        ];

        // Override with pending values if they exist
        $pendingChanges = \App\Models\PendingProfileChange::where('member_id', $this->id)
            ->where('status', 'pending')
            ->get()
            ->keyBy('field_name');

        foreach ($pendingChanges as $fieldName => $change) {
            if (isset($values[$fieldName])) {
                $values[$fieldName] = $change->new_value;
            }
        }

        // Check if all required fields are filled
        // Use trim() to handle whitespace-only values and check for null/empty
        return !empty(trim($values['name'] ?? '')) &&
               !empty(trim($values['phone'] ?? '')) &&
               !empty(trim($values['email'] ?? '')) &&
               !empty(trim($values['id_number'] ?? '')) &&
               !empty(trim($values['church'] ?? '')) &&
               !empty(trim($values['next_of_kin_name'] ?? '')) &&
               !empty(trim($values['next_of_kin_phone'] ?? '')) &&
               !empty(trim($values['next_of_kin_relationship'] ?? ''));
    }

    /**
     * Get list of missing profile fields (including pending changes)
     */
    public function getMissingProfileFields(): array
    {
        // Get current values
        $values = [
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'id_number' => $this->id_number,
            'church' => $this->church,
            'next_of_kin_name' => $this->next_of_kin_name,
            'next_of_kin_phone' => $this->next_of_kin_phone,
            'next_of_kin_relationship' => $this->next_of_kin_relationship,
        ];

        // Override with pending values if they exist
        $pendingChanges = \App\Models\PendingProfileChange::where('member_id', $this->id)
            ->where('status', 'pending')
            ->get()
            ->keyBy('field_name');

        foreach ($pendingChanges as $fieldName => $change) {
            if (isset($values[$fieldName])) {
                $values[$fieldName] = $change->new_value;
            }
        }

        // Check which fields are missing
        // Use trim() to handle whitespace-only values
        $missing = [];
        if (empty(trim($values['name'] ?? ''))) $missing[] = 'name';
        if (empty(trim($values['phone'] ?? ''))) $missing[] = 'phone';
        if (empty(trim($values['email'] ?? ''))) $missing[] = 'email';
        if (empty(trim($values['id_number'] ?? ''))) $missing[] = 'id_number';
        if (empty(trim($values['church'] ?? ''))) $missing[] = 'church';
        if (empty(trim($values['next_of_kin_name'] ?? ''))) $missing[] = 'next_of_kin_name';
        if (empty(trim($values['next_of_kin_phone'] ?? ''))) $missing[] = 'next_of_kin_phone';
        if (empty(trim($values['next_of_kin_relationship'] ?? ''))) $missing[] = 'next_of_kin_relationship';
        
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

