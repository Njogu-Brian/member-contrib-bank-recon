<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Budgets\BudgetMonthRequest;
use App\Http\Requests\Budgets\BudgetRequest;
use App\Models\BudgetMonth;
use App\Services\BudgetService;
use Illuminate\Http\JsonResponse;

class BudgetController extends Controller
{
    public function __construct(private readonly BudgetService $budgetService)
    {
        $this->middleware('can:manage-budget')->only(['store', 'updateMonth']);
    }

    public function index(): JsonResponse
    {
        return response()->json($this->budgetService->list());
    }

    public function store(BudgetRequest $request): JsonResponse
    {
        $budget = $this->budgetService->create($request->validated(), $request->user()->id);

        return response()->json($budget, 201);
    }

    public function updateMonth(BudgetMonthRequest $request, BudgetMonth $budgetMonth): JsonResponse
    {
        $month = $this->budgetService->updateMonth($budgetMonth, $request->validated(), $request->user()->id);

        return response()->json($month);
    }
}

