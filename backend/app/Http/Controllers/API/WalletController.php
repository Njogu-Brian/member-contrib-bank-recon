<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Wallet\StoreContributionRequest;
use App\Http\Requests\Wallet\StoreWalletRequest;
use App\Http\Resources\WalletResource;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(private readonly WalletService $walletService)
    {
        $this->middleware('can:manage-wallets')->only(['store', 'contribute', 'penalize']);
    }

    public function index(Request $request): JsonResponse
    {
        $wallets = $this->walletService->list($request->query('member_id'));

        return response()->json(WalletResource::collection($wallets));
    }

    public function store(StoreWalletRequest $request): JsonResponse
    {
        $wallet = $this->walletService->create($request->validated());

        return (new WalletResource($wallet))->response()->setStatusCode(201);
    }

    public function show(int $walletId): JsonResponse
    {
        $wallet = $this->walletService->find($walletId);

        return response()->json(new WalletResource($wallet));
    }

    public function contribute(StoreContributionRequest $request, int $walletId): JsonResponse
    {
        $contribution = $this->walletService->contribute($walletId, $request->validated());

        return response()->json($contribution, 201);
    }

    public function penalties(Request $request, int $memberId): JsonResponse
    {
        $penalties = $this->walletService->penalties($memberId);

        return response()->json($penalties);
    }

    /**
     * Sync transactions to contributions for a member
     */
    public function syncTransactions(Request $request, int $memberId): JsonResponse
    {
        $validated = $request->validate([
            'dry_run' => 'sometimes|boolean',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
        ]);

        $member = \App\Models\Member::findOrFail($memberId);
        
        $result = $this->walletService->syncTransactionsToContributions($member, $validated);

        return response()->json([
            'message' => $result['dry_run'] ? 'Dry run completed' : 'Transactions synced successfully',
            'result' => $result,
        ]);
    }
}

