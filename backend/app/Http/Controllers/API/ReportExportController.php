<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportExportController extends Controller
{
    public function __construct(private readonly ReportService $reportService)
    {
        $this->middleware('can:manage-reports')->only(['store']);
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->reportService->listExports($request->user()->id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string'],
            'format' => ['required', 'in:pdf,csv,excel'],
            'filters' => ['nullable', 'array'],
        ]);

        $export = $this->reportService->queueExport(
            $request->user()->id,
            $data['type'],
            $data['format'],
            $data['filters'] ?? []
        );

        return response()->json($export, 201);
    }
}

