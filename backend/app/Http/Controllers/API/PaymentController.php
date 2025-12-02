<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payments\MpesaCallbackRequest;
use App\Http\Requests\Payments\PaymentReceiptRequest;
use App\Models\Payment;
use App\Services\MpesaReconciliationService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly MpesaReconciliationService $reconciliationService
    ) {
        $this->middleware('can:manage-payments')->only(['issueReceipt', 'reconcile', 'reconciliationLogs', 'retryReconciliation']);
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

    /**
     * Reconcile a payment
     */
    public function reconcile(Request $request, Payment $payment): JsonResponse
    {
        try {
            $result = $this->reconciliationService->reconcilePayment($payment, auth()->id());

            return response()->json([
                'message' => 'Payment reconciled successfully',
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to reconcile payment: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get reconciliation logs
     */
    public function reconciliationLogs(Request $request): JsonResponse
    {
        try {
            $filters = $request->only([
                'status',
                'payment_id',
                'transaction_id',
                'date_from',
                'date_to',
                'per_page',
                'page',
            ]);
            
            // Remove empty status filter (can cause issues)
            if (isset($filters['status']) && $filters['status'] === '') {
                unset($filters['status']);
            }

            $logs = $this->reconciliationService->getReconciliationLogs($filters);

            return response()->json($logs);
        } catch (\Exception $e) {
            \Log::error('Reconciliation logs error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch reconciliation logs: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    /**
     * Retry reconciliation for a payment
     */
    public function retryReconciliation(Payment $payment): JsonResponse
    {
        try {
            $result = $this->reconciliationService->retryReconciliation($payment, auth()->id());

            return response()->json([
                'message' => 'Reconciliation retried successfully',
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retry reconciliation: ' . $e->getMessage(),
            ], 422);
        }
    }
}

