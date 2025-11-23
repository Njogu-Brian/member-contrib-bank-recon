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
}

