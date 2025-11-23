<?php

namespace App\Services;

use App\Models\Investment;
use App\Models\InvestmentPayout;
use App\Models\RoiCalculation;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class InvestmentService
{
    public function __construct(private readonly AuditLogger $auditLogger)
    {
    }

    public function list(array $filters = []): Collection
    {
        $query = Investment::with('member');

        if (! empty($filters['member_id'])) {
            $query->where('member_id', $filters['member_id']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest()->get();
    }

    public function find(int $investmentId): Investment
    {
        return Investment::with(['member', 'payouts', 'roiCalculations'])->findOrFail($investmentId);
    }

    public function create(array $data): Investment
    {
        return DB::transaction(function () use ($data) {
            $investment = Investment::create($data);
            $this->generateRoiSnapshot($investment);
            $this->schedulePayouts($investment);

            $this->auditLogger->log(auth()->id(), 'investment.created', $investment, $data);

            return $investment->fresh('payouts');
        });
    }

    public function update(int $investmentId, array $data): Investment
    {
        return DB::transaction(function () use ($investmentId, $data) {
            $investment = Investment::findOrFail($investmentId);
            $investment->update($data);
            $this->generateRoiSnapshot($investment);

            $this->auditLogger->log(auth()->id(), 'investment.updated', $investment, $data);

            return $investment->fresh('payouts');
        });
    }

    protected function schedulePayouts(Investment $investment): void
    {
        if (! $investment->end_date) {
            return;
        }

        $start = Carbon::parse($investment->start_date)->startOfMonth();
        $end = Carbon::parse($investment->end_date)->startOfMonth();
        $months = $start->diffInMonths($end) + 1;
        $monthlyAmount = $months ? $investment->principal_amount / $months : $investment->principal_amount;

        for ($i = 0; $i < $months; $i++) {
            InvestmentPayout::firstOrCreate(
                [
                    'investment_id' => $investment->id,
                    'scheduled_for' => $start->copy()->addMonths($i)->endOfMonth(),
                ],
                [
                    'amount' => round($monthlyAmount, 2),
                    'status' => 'scheduled',
                ]
            );
        }
    }

    protected function generateRoiSnapshot(Investment $investment): void
    {
        $durationInYears = max(
            0.01,
            Carbon::parse($investment->start_date)->diffInMonths($investment->end_date ?? now()) / 12
        );

        $accrued = $investment->principal_amount * ($investment->expected_roi_rate / 100) * $durationInYears;

        RoiCalculation::create([
            'investment_id' => $investment->id,
            'principal' => $investment->principal_amount,
            'accrued_interest' => round($accrued, 2),
            'calculated_on' => now()->toDateString(),
            'inputs' => [
                'duration_years' => $durationInYears,
                'roi_rate' => $investment->expected_roi_rate,
            ],
        ]);
    }
}

