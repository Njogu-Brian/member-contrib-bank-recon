<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\API\AuthController as MobileAuthController;
use App\Http\Controllers\API\MemberController as MobileMemberController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DuplicateController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ContributionStatusRuleController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\ManualContributionController;
use App\Http\Controllers\MeetingAttendanceUploadController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\StatementController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

// Health checks
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
    ]);
});
Route::get('/test', function () {
    return response()->json(['message' => 'API is working']);
});

Route::prefix('mobile')->group(function () {
    Route::post('/auth/login', [MobileAuthController::class, 'login']);
    Route::post('/auth/register', [MobileAuthController::class, 'register']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [MobileAuthController::class, 'user']);
        Route::post('/auth/logout', [MobileAuthController::class, 'logout']);

        Route::get('/members', [MobileMemberController::class, 'index']);
        Route::get('/members/{member}', [MobileMemberController::class, 'show']);
    });
});

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Members
    Route::apiResource('members', MemberController::class);
    Route::post('/members/bulk-upload', [MemberController::class, 'bulkUpload']);
    Route::get('/members/{member}/statement', [MemberController::class, 'statement']);
    Route::get('/members/{member}/statement/export', [MemberController::class, 'exportStatement']);
    Route::get('/members/statements/export', [MemberController::class, 'exportBulkStatements']);

    // Contribution status rules
    Route::get('/contribution-statuses', [ContributionStatusRuleController::class, 'index']);
    Route::post('/contribution-statuses', [ContributionStatusRuleController::class, 'store']);
    Route::put('/contribution-statuses/{contributionStatus}', [ContributionStatusRuleController::class, 'update']);
    Route::delete('/contribution-statuses/{contributionStatus}', [ContributionStatusRuleController::class, 'destroy']);
    Route::post('/contribution-statuses/reorder', [ContributionStatusRuleController::class, 'reorder']);

    // Bank Statements
    Route::apiResource('statements', StatementController::class)->except(['update']);
    Route::post('/statements/upload', [StatementController::class, 'upload']);
    Route::post('/statements/{statement}/reanalyze', [StatementController::class, 'reanalyze']);
    Route::post('/statements/reanalyze-all', [StatementController::class, 'reanalyzeAll']);
    Route::get('/statements/{statement}/document-metadata', [StatementController::class, 'documentMetadata']);
    Route::get('/statements/{statement}/document', [StatementController::class, 'document'])->name('statements.document');

    // Transactions
    Route::apiResource('transactions', TransactionController::class)->only(['index', 'show']);
    Route::post('/transactions/{transaction}/assign', [TransactionController::class, 'assign']);
    Route::post('/transactions/{transaction}/split', [TransactionController::class, 'split']);
    Route::post('/transactions/{transaction}/transfer', [TransactionController::class, 'transfer']);
    Route::post('/transactions/auto-assign', [TransactionController::class, 'autoAssign']);
    Route::post('/transactions/bulk-assign', [TransactionController::class, 'bulkAssign']);
    Route::post('/transactions/archive-bulk', [TransactionController::class, 'bulkArchive']);
    Route::post('/transactions/{transaction}/archive', [TransactionController::class, 'archive']);
    Route::delete('/transactions/{transaction}/archive', [TransactionController::class, 'unarchive']);
    Route::post('/transactions/{transaction}/ask-ai', [TransactionController::class, 'askAi']);

    // Expenses
    Route::apiResource('expenses', ExpenseController::class);

    // Manual Contributions
    Route::apiResource('manual-contributions', ManualContributionController::class);
    Route::post('/manual-contributions/import-excel', [ManualContributionController::class, 'importExcel']);

    // Meeting attendance uploads
    Route::get('/attendance-uploads/{attendanceUpload}/download', [MeetingAttendanceUploadController::class, 'download']);
    Route::apiResource('attendance-uploads', MeetingAttendanceUploadController::class)->only(['index', 'store', 'show', 'destroy']);

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Reports
    Route::get('/reports/summary', [ReportController::class, 'summary']);
    Route::get('/reports/contributions', [ReportController::class, 'contributions']);
    Route::get('/reports/deposits', [ReportController::class, 'deposits']);
    Route::get('/reports/expenses', [ReportController::class, 'expenses']);
    Route::get('/reports/members', [ReportController::class, 'members']);
    Route::get('/reports/transactions', [ReportController::class, 'transactions']);

    // Duplicates
    Route::get('/duplicates', [DuplicateController::class, 'index']);

    // Audits
    Route::get('/audits', [AuditController::class, 'index']);
    Route::get('/audits/{auditRun}', [AuditController::class, 'show']);
    Route::post('/audits/contributions', [AuditController::class, 'upload']);
    Route::post('/audits/{auditRun}/reanalyze', [AuditController::class, 'reanalyze']);
    Route::delete('/audits/{auditRun}', [AuditController::class, 'destroy']);
    Route::get('/audits/member/{member}', [AuditController::class, 'memberResults']);
});
