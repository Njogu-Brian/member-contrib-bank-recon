<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Investments\InvestmentRequest;
use App\Services\InvestmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvestmentController extends Controller
{
    public function __construct(private readonly InvestmentService $investmentService)
    {
        $this->middleware('can:manage-investments')->except(['index', 'show']);
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->investmentService->list($request->all()));
    }

    public function store(InvestmentRequest $request): JsonResponse
    {
        $investment = $this->investmentService->create($request->validated());

        return response()->json($investment, 201);
    }

    public function show(int $investmentId): JsonResponse
    {
        return response()->json($this->investmentService->find($investmentId));
    }

    public function update(InvestmentRequest $request, int $investmentId): JsonResponse
    {
        $investment = $this->investmentService->update($investmentId, $request->validated());

        return response()->json($investment);
    }

    /**
     * Calculate ROI for an investment
     */
    public function calculateRoi(Request $request, int $investmentId): JsonResponse
    {
        $investment = $this->investmentService->find($investmentId);
        
        $asOfDate = $request->has('as_of_date') 
            ? \Carbon\Carbon::parse($request->as_of_date) 
            : null;

        $roiCalculation = $this->investmentService->calculateRoi($investment, $asOfDate);

        return response()->json([
            'message' => 'ROI calculated successfully',
            'calculation' => $roiCalculation,
        ]);
    }

    /**
     * Get ROI history for an investment
     */
    public function roiHistory(int $investmentId): JsonResponse
    {
        $investment = $this->investmentService->find($investmentId);
        $history = $this->investmentService->getRoiHistory($investment);

        return response()->json($history);
    }

    /**
     * Process investment payout
     */
    public function payout(Request $request, int $investmentId, int $payoutId): JsonResponse
    {
        $validated = $request->validate([
            'paid_at' => 'sometimes|date',
            'metadata' => 'sometimes|array',
        ]);

        $investment = $this->investmentService->find($investmentId);
        $payout = \App\Models\InvestmentPayout::where('investment_id', $investmentId)
            ->findOrFail($payoutId);

        $payout = $this->investmentService->processPayout($investment, $payout, $validated);

        return response()->json([
            'message' => 'Payout processed successfully',
            'payout' => $payout,
        ]);
    }
}

