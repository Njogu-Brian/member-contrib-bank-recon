<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ManualContributionController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\StatementController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Members
    Route::apiResource('members', MemberController::class);
    Route::post('members/bulk-upload', [MemberController::class, 'bulkUpload']);

    // Bank Statements
    Route::get('statements', [StatementController::class, 'index']);
    Route::get('statements/{statement}', [StatementController::class, 'show']);
    Route::post('statements/upload', [StatementController::class, 'upload']);
    Route::delete('statements/{statement}', [StatementController::class, 'destroy']);

    // Transactions
    Route::get('transactions', [TransactionController::class, 'index']);
    Route::get('transactions/{transaction}', [TransactionController::class, 'show']);
    Route::post('transactions/{transaction}/assign', [TransactionController::class, 'assign']);
    Route::post('transactions/{transaction}/split', [TransactionController::class, 'split']);
    Route::post('transactions/auto-assign', [TransactionController::class, 'autoAssign']);
    Route::post('transactions/bulk-assign', [TransactionController::class, 'bulkAssign']);
    Route::post('transactions/ask-ai', [TransactionController::class, 'askAi']);

    // Manual Contributions
    Route::apiResource('manual-contributions', ManualContributionController::class);

    // Expenses
    Route::apiResource('expenses', ExpenseController::class);

    // Settings
    Route::get('settings', [\App\Http\Controllers\SettingController::class, 'index']);
    Route::put('settings', [\App\Http\Controllers\SettingController::class, 'update']);
    Route::get('settings/current-week', [\App\Http\Controllers\SettingController::class, 'getCurrentWeek']);
});
