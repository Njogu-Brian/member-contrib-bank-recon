<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Models\ContributionStatusRule;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'member_code',
        'member_number',
        'date_of_registration',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'date_of_registration' => 'date',
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
        $startDate = Setting::get('contribution_start_date');
        $weeklyAmount = (float) Setting::get('weekly_contribution_amount', 1000);

        if (!$startDate) {
            return 0;
        }

        $start = Carbon::parse($startDate)->startOfWeek();
        $now = Carbon::now();
        $endOfFirstWeek = $start->copy()->endOfWeek();
        
        // If current date is before the end of the first week, no contributions are expected yet
        // We need to wait for a full week to complete before expecting any contribution
        if ($now->lt($endOfFirstWeek)) {
            return 0;
        }

        // Count only full weeks that have completely passed
        // Start counting from the Monday after the first week ends
        // So if start date is Monday, first week ends Sunday, contributions start counting from next Monday
        $firstContributionWeekStart = $endOfFirstWeek->copy()->addDay()->startOfWeek();
        
        // If we haven't reached the start of the first contribution week, return 0
        if ($now->lt($firstContributionWeekStart)) {
            return 0;
        }

        // Count full weeks from the first contribution week start
        // diffInWeeks with false parameter means don't round up
        $weeks = max(0, floor($firstContributionWeekStart->diffInDays($now) / 7));
        
        // Add 1 week because the first week should count after it completes
        // If we're in week 1 after start, we expect 1 week's contribution
        $weeks += 1;

        return $weeks * $weeklyAmount;
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
}

