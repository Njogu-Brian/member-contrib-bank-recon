<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payments\MpesaCallbackRequest;
use App\Http\Requests\Payments\PaymentReceiptRequest;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService)
    {
        $this->middleware('can:manage-payments')->only(['issueReceipt']);
    }

    public function mpesaCallback(MpesaCallbackRequest $request): JsonResponse
    {
        $this->paymentService->handleMpesaCallback($request->validated());

        return response()->json(['status' => 'ok']);
    }

    public function issueReceipt(PaymentReceiptRequest $request, int $paymentId): JsonResponse
    {
        $receipt = $this->paymentService->generateReceipt($paymentId, $request->validated());

        return response()->json($receipt);
    }
}

