<?php

use App\Http\Controllers\API\AnnouncementController;
use App\Http\Controllers\API\AuthController as MobileAuthController;
use App\Http\Controllers\API\BudgetController;
use App\Http\Controllers\API\MemberController as MobileMemberController;
use App\Http\Controllers\API\MeetingController;
use App\Http\Controllers\API\InvestmentController;
use App\Http\Controllers\API\PaymentController;
use App\Http\Controllers\API\ReportExportController;
use App\Http\Controllers\API\NotificationPreferenceController;
use App\Http\Controllers\API\WalletController;
use App\Http\Controllers\AuthController;
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
use App\Http\Controllers\PublicMemberStatementController;
use App\Http\Controllers\SmsController;
use App\Http\Controllers\StatementController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\ActivityLogController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('public')->group(function () {
        Route::get('/health', function () {
            return response()->json([
                'status' => 'ok',
                'timestamp' => now(),
            ]);
        });

        Route::get('/test', function () {
            return response()->json(['message' => 'API is working']);
        });
        
        // Public settings for login page (logo, favicon, branding)
        Route::get('/settings', [SettingController::class, 'publicIndex']);
        
        // Public dashboard snapshot for login page
        Route::get('/dashboard/snapshot', [DashboardController::class, 'publicSnapshot']);
        
        // Public announcements for login page
        Route::get('/announcements', [AnnouncementController::class, 'publicList']);
        
        // Public member statement view (no authentication required)
        // Shortened path: /s/{token} for SMS links
        Route::get('/statement/{token}', [PublicMemberStatementController::class, 'show']);
        Route::get('/statement/{token}/pdf', [PublicMemberStatementController::class, 'exportPdf']);
    });

    Route::prefix('webhooks')->group(function () {
        Route::post('/payments/mpesa/callback', [PaymentController::class, 'mpesaCallback']);
    });

    Route::prefix('mobile')->group(function () {
        Route::post('/auth/login', [MobileAuthController::class, 'login']);
        Route::post('/auth/register', [MobileAuthController::class, 'register']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/auth/me', [MobileAuthController::class, 'user']);
            Route::post('/auth/logout', [MobileAuthController::class, 'logout']);
            Route::get('/kyc/profile', [MobileAuthController::class, 'profile']);
            Route::put('/kyc/profile', [MobileAuthController::class, 'updateProfile']);
            Route::post('/kyc/documents', [MobileAuthController::class, 'uploadDocument']);
            Route::post('/mfa/enable', [MobileAuthController::class, 'enableMfa']);
            Route::post('/mfa/disable', [MobileAuthController::class, 'disableMfa']);

            Route::get('/members', [MobileMemberController::class, 'index']);
            Route::get('/members/{member}', [MobileMemberController::class, 'show']);
        });
    });

    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/password/reset-request', [AuthController::class, 'sendPasswordReset']);
        Route::post('/password/reset', [AuthController::class, 'resetPassword']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'user']);
            Route::post('/password/change', [AuthController::class, 'changePassword']);
            // MFA routes for web
            Route::get('/mfa/setup', [AuthController::class, 'getMfaSetup']);
            Route::post('/mfa/enable', [AuthController::class, 'enableMfa']);
            Route::post('/mfa/disable', [AuthController::class, 'disableMfa']);
            Route::post('/mfa/verify', [AuthController::class, 'verifyMfa']);
        });
    });

    // Protected routes
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Members
        Route::apiResource('members', MemberController::class);
        Route::post('/members/bulk-upload', [MemberController::class, 'bulkUpload']);
        Route::get('/members/{member}/statement', [MemberController::class, 'statement']);
        Route::get('/members/{member}/statement/export', [MemberController::class, 'exportStatement']);
        Route::get('/members/statements/export', [MemberController::class, 'exportBulkStatements']);

        // Wallets & Contributions
        Route::get('/wallets', [WalletController::class, 'index']);
        Route::post('/wallets', [WalletController::class, 'store']);
        Route::get('/wallets/{wallet}', [WalletController::class, 'show']);
        Route::post('/wallets/{wallet}/contributions', [WalletController::class, 'contribute']);
        Route::get('/members/{member}/penalties', [WalletController::class, 'penalties']);

        // Payments
        Route::post('/payments/{payment}/receipt', [PaymentController::class, 'issueReceipt']);

        // Investments
        Route::apiResource('investments', InvestmentController::class);

        // Announcements
        Route::apiResource('announcements', AnnouncementController::class);

        // Notification preferences
        Route::get('/notification-preferences', [NotificationPreferenceController::class, 'show']);
        Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);
        Route::get('/notifications/log', [NotificationPreferenceController::class, 'log']);

        // Meetings & motions
        Route::get('/meetings', [MeetingController::class, 'index']);
        Route::post('/meetings', [MeetingController::class, 'store']);
        Route::post('/meetings/{meeting}/motions', [MeetingController::class, 'addMotion']);
        Route::post('/motions/{motion}/votes', [MeetingController::class, 'vote']);

        // Budgets
        Route::get('/budgets', [BudgetController::class, 'index']);
        Route::post('/budgets', [BudgetController::class, 'store']);
        Route::put('/budget-months/{budgetMonth}', [BudgetController::class, 'updateMonth']);

        // Reports & exports
        Route::get('/report-exports', [ReportExportController::class, 'index']);
        Route::post('/report-exports', [ReportExportController::class, 'store']);

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
        Route::post('/duplicates/reanalyze', [DuplicateController::class, 'reanalyze']);

        // SMS
        Route::get('/sms/logs', [SmsController::class, 'logs']);
        Route::get('/sms/statistics', [SmsController::class, 'statistics']);
        Route::post('/sms/bulk', [SmsController::class, 'sendBulk']);
        Route::post('/sms/members/{member}', [SmsController::class, 'sendSingle']);

        // Audits
        Route::get('/audits', [AuditController::class, 'index']);
        Route::get('/audits/{auditRun}', [AuditController::class, 'show']);
        Route::post('/audits/contributions', [AuditController::class, 'upload']);
        Route::post('/audits/{auditRun}/reanalyze', [AuditController::class, 'reanalyze']);
        Route::delete('/audits/{auditRun}', [AuditController::class, 'destroy']);
        Route::get('/audits/member/{member}', [AuditController::class, 'memberResults']);

        // Admin Management (under /v1/admin/admin/*)
        Route::prefix('admin')->group(function () {
            // Staff Management
            Route::get('/staff', [StaffController::class, 'index']);
            Route::post('/staff', [StaffController::class, 'store']);
            Route::get('/staff/{user}', [StaffController::class, 'show']);
            Route::put('/staff/{user}', [StaffController::class, 'update']);
            Route::delete('/staff/{user}', [StaffController::class, 'destroy']);
            Route::post('/staff/{user}/reset-password', [StaffController::class, 'resetPassword']);
            Route::post('/staff/{user}/toggle-status', [StaffController::class, 'toggleStatus']);

            // Role Management
            Route::get('/roles', [RoleController::class, 'index']);
            Route::post('/roles', [RoleController::class, 'store']);
            Route::get('/roles/{role}', [RoleController::class, 'show']);
            Route::put('/roles/{role}', [RoleController::class, 'update']);
            Route::delete('/roles/{role}', [RoleController::class, 'destroy']);

            // Permission Management
            Route::get('/permissions', [PermissionController::class, 'index']);
            Route::post('/permissions', [PermissionController::class, 'store']);
            Route::get('/permissions/{permission}', [PermissionController::class, 'show']);
            Route::put('/permissions/{permission}', [PermissionController::class, 'update']);
            Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy']);

            // Activity Logs
            Route::get('/activity-logs', [ActivityLogController::class, 'index']);
            Route::get('/activity-logs/statistics', [ActivityLogController::class, 'statistics']);
            Route::get('/activity-logs/{activityLog}', [ActivityLogController::class, 'show']);

            // Admin Settings
            Route::get('/settings', [\App\Http\Controllers\Admin\AdminSettingsController::class, 'index']);
            Route::put('/settings', [\App\Http\Controllers\Admin\AdminSettingsController::class, 'update']);
            Route::post('/settings', [\App\Http\Controllers\Admin\AdminSettingsController::class, 'update']); // POST for file uploads
        });
    });
});
