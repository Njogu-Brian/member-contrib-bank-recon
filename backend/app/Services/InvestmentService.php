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
            // Ensure status has a default value
            if (!isset($data['status'])) {
                $data['status'] = 'active';
            }

            // Validate principal_amount is positive
            if (isset($data['principal_amount']) && $data['principal_amount'] <= 0) {
                throw new \InvalidArgumentException('Principal amount must be greater than 0');
            }

            // Validate expected_roi_rate is within valid range
            if (isset($data['expected_roi_rate']) && ($data['expected_roi_rate'] < 0 || $data['expected_roi_rate'] > 100)) {
                throw new \InvalidArgumentException('Expected ROI rate must be between 0 and 100');
            }

            $investment = Investment::create($data);
            
            // Only generate ROI snapshot if we have valid dates
            if ($investment->start_date) {
                try {
                    $this->generateRoiSnapshot($investment);
                } catch (\Exception $e) {
                    // Log error but don't fail investment creation
                    \Log::warning('Failed to generate ROI snapshot during investment creation', [
                        'investment_id' => $investment->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Only schedule payouts if end_date is set
            if ($investment->end_date) {
                try {
                    $this->schedulePayouts($investment);
                } catch (\Exception $e) {
                    // Log error but don't fail investment creation
                    \Log::warning('Failed to schedule payouts during investment creation', [
                        'investment_id' => $investment->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

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
        if (! $investment->end_date || ! $investment->start_date) {
            return;
        }

        $start = Carbon::parse($investment->start_date)->startOfMonth();
        $end = Carbon::parse($investment->end_date)->startOfMonth();
        
        // Ensure end is after start
        if ($end->lte($start)) {
            return; // Invalid date range
        }

        $months = $start->diffInMonths($end) + 1;
        
        if ($months <= 0) {
            return; // Invalid month count
        }

        $principalAmount = (float) ($investment->principal_amount ?? 0);
        if ($principalAmount <= 0) {
            return; // Invalid principal amount
        }

        $monthlyAmount = $principalAmount / $months;

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
        if (!$investment->start_date) {
            return; // Cannot calculate ROI without start date
        }

        $startDate = Carbon::parse($investment->start_date);
        $endDate = $investment->end_date ? Carbon::parse($investment->end_date) : now();
        
        // Ensure end date is not before start date
        if ($endDate->lt($startDate)) {
            $endDate = $startDate->copy()->addDay(); // Use at least 1 day
        }

        $durationInMonths = $startDate->diffInMonths($endDate);
        $durationInYears = max(0.01, $durationInMonths / 12);

        // Ensure principal_amount and expected_roi_rate are valid numbers
        $principalAmount = (float) ($investment->principal_amount ?? 0);
        $roiRate = (float) ($investment->expected_roi_rate ?? 0);

        if ($principalAmount <= 0) {
            return; // Cannot calculate ROI with zero or negative principal
        }

        $accrued = $principalAmount * ($roiRate / 100) * $durationInYears;

        RoiCalculation::create([
            'investment_id' => $investment->id,
            'principal' => $principalAmount,
            'accrued_interest' => round($accrued, 2),
            'calculated_on' => now()->toDateString(),
            'inputs' => [
                'duration_months' => $durationInMonths,
                'duration_years' => $durationInYears,
                'roi_rate' => $roiRate,
            ],
        ]);
    }

    /**
     * Calculate ROI for an investment
     */
    public function calculateRoi(Investment $investment, ?Carbon $asOfDate = null): RoiCalculation
    {
        $asOfDate = $asOfDate ?? now();
        $endDate = $investment->end_date ? Carbon::parse($investment->end_date) : $asOfDate;
        $startDate = Carbon::parse($investment->start_date);

        $durationInYears = max(0.01, $startDate->diffInMonths($endDate) / 12);
        $accrued = $investment->principal_amount * ($investment->expected_roi_rate / 100) * $durationInYears;

        return RoiCalculation::create([
            'investment_id' => $investment->id,
            'principal' => $investment->principal_amount,
            'accrued_interest' => round($accrued, 2),
            'calculated_on' => $asOfDate->toDateString(),
            'inputs' => [
                'duration_years' => $durationInYears,
                'roi_rate' => $investment->expected_roi_rate,
                'as_of_date' => $asOfDate->toDateString(),
            ],
        ]);
    }

    /**
     * Get ROI history for an investment
     */
    public function getRoiHistory(Investment $investment): Collection
    {
        return RoiCalculation::where('investment_id', $investment->id)
            ->orderBy('calculated_on', 'desc')
            ->get();
    }

    /**
     * Process investment payout
     */
    public function processPayout(Investment $investment, InvestmentPayout $payout, array $data = []): InvestmentPayout
    {
        if ($payout->status !== 'scheduled') {
            throw new \Exception('Payout must be scheduled to process');
        }

        return DB::transaction(function () use ($investment, $payout, $data) {
            $payout->update([
                'status' => 'paid',
                'paid_at' => $data['paid_at'] ?? now(),
                'metadata' => array_merge($payout->metadata ?? [], $data['metadata'] ?? []),
            ]);

            $this->auditLogger->log(auth()->id(), 'investment.payout_processed', $payout, $data);

            return $payout->fresh();
        });
    }
}

