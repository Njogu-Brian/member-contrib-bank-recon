<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExpenseController;
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

    // Transactions
    Route::get('transactions', [TransactionController::class, 'index']);
    Route::get('transactions/{transaction}', [TransactionController::class, 'show']);
    Route::post('transactions/{transaction}/assign', [TransactionController::class, 'assign']);
    Route::post('transactions/ask-ai', [TransactionController::class, 'askAi']);

    // Expenses
    Route::apiResource('expenses', ExpenseController::class);
});
