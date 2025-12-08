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
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\DuplicateController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ContributionStatusRuleController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\ManualContributionController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\InvoiceTypeController;
use App\Http\Controllers\InvoiceReportController;
use App\Http\Controllers\MeetingAttendanceUploadController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\PublicMemberStatementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SmsController;
use App\Http\Controllers\StatementController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\AccountingController;
use App\Http\Controllers\KycController;
use App\Http\Controllers\PendingProfileChangeController;
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
        
        // Public profile management
        Route::get('/profile/{token}/status', [ProfileController::class, 'checkProfileStatus']);
        Route::get('/profile/{token}/check-duplicate', [ProfileController::class, 'checkDuplicate']);
        Route::post('/profile/{token}/update', [ProfileController::class, 'updateProfile']);
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

            // Mobile Wallet Routes
            Route::get('/wallets', [WalletController::class, 'mobileIndex']);
            Route::get('/wallets/{wallet}', [WalletController::class, 'show']);
            Route::post('/wallets/{wallet}/contributions', [WalletController::class, 'mobileContribute']);

            // Mobile Investment Routes
            Route::get('/investments', [InvestmentController::class, 'mobileIndex']);
            Route::post('/investments', [InvestmentController::class, 'mobileStore']);
            Route::get('/investments/{investment}', [InvestmentController::class, 'show']);
            Route::get('/investments/{investment}/roi', [InvestmentController::class, 'mobileRoi']);

            // Mobile Dashboard Route
            Route::get('/dashboard', [DashboardController::class, 'mobileIndex']);

            // Mobile Voting Route
            Route::post('/motions/{motion}/vote', [MeetingController::class, 'mobileVote']);

            // Mobile Announcements (read-only access)
            Route::get('/announcements', [AnnouncementController::class, 'mobileIndex']);

            // Mobile Meetings (read-only access)
            Route::get('/meetings', [MeetingController::class, 'mobileIndex']);

            // Mobile Notifications
            Route::get('/notifications', [NotificationPreferenceController::class, 'mobileLog']);
            Route::get('/notifications/preferences', [NotificationPreferenceController::class, 'mobileShow']);
            Route::put('/notifications/preferences', [NotificationPreferenceController::class, 'mobileUpdate']);

            // Mobile Profile Management
            Route::get('/profile', [MobileAuthController::class, 'getProfile']);
            Route::put('/profile', [MobileAuthController::class, 'updateProfile']);
            Route::post('/profile/photo', [MobileAuthController::class, 'uploadProfilePhoto']);

            // Mobile Statement Export
            Route::get('/members/{member}/statement/export', [MemberController::class, 'exportStatement']);
            Route::get('/members/{member}/investment-report/export', [MemberController::class, 'exportInvestmentReport']);

            // Mobile MFA Setup
            Route::get('/mfa/setup', [MobileAuthController::class, 'getMfaSetup']);
            Route::post('/mfa/verify', [MobileAuthController::class, 'verifyMfa']);

            // Mobile KYC Documents
            Route::post('/kyc/documents/front-id', [MobileAuthController::class, 'uploadFrontId']);
            Route::post('/kyc/documents/back-id', [MobileAuthController::class, 'uploadBackId']);
            Route::post('/kyc/documents/kra-pin', [MobileAuthController::class, 'uploadKraPin']);
            Route::post('/kyc/documents/profile-photo', [MobileAuthController::class, 'uploadKycProfilePhoto']);

            // Mobile Reports
            Route::get('/reports/investment', [MobileAuthController::class, 'downloadInvestmentReport']);
            Route::get('/reports/statement', [MobileAuthController::class, 'downloadStatementReport']);
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

        // Pending Profile Changes - MUST come before members routes to avoid route conflicts
        Route::get('/pending-profile-changes', [PendingProfileChangeController::class, 'index']);
        Route::get('/pending-profile-changes/statistics', [PendingProfileChangeController::class, 'statistics']);
        Route::post('/pending-profile-changes/{change}/approve', [PendingProfileChangeController::class, 'approve']);
        Route::post('/pending-profile-changes/{change}/reject', [PendingProfileChangeController::class, 'reject']);
        Route::post('/pending-profile-changes/member/{member}/approve-all', [PendingProfileChangeController::class, 'approveMemberChanges']);
        Route::post('/pending-profile-changes/approve-all', [PendingProfileChangeController::class, 'approveAllChanges']);

        // Members
        // IMPORTANT: Specific routes must come before apiResource to avoid route conflicts
        // This route prevents /members/pending-profile-changes from matching /members/{member}
        Route::get('/members/pending-profile-changes', [PendingProfileChangeController::class, 'index']);
        Route::get('/members/pending-profile-changes/statement', [PendingProfileChangeController::class, 'statement']);
        Route::get('/members/profile-update-status', [MemberController::class, 'profileUpdateStatus']);
        Route::post('/members/{member}/reset-profile-link', [MemberController::class, 'resetProfileLink'])->where('member', '[0-9]+');
        Route::post('/members/reset-all-profile-links', [MemberController::class, 'resetAllProfileLinks']);
        Route::post('/members/bulk-upload', [MemberController::class, 'bulkUpload']);
        Route::get('/members/{member}/statement', [MemberController::class, 'statement'])->where('member', '[0-9]+');
        Route::get('/members/{member}/statement/export', [MemberController::class, 'exportStatement'])->where('member', '[0-9]+');
        Route::get('/members/{member}/investment-report/export', [MemberController::class, 'exportInvestmentReport'])->where('member', '[0-9]+');
        Route::get('/members/statements/export', [MemberController::class, 'exportBulkStatements']);
        Route::post('/members/{member}/activate', [KycController::class, 'activateMember'])->where('member', '[0-9]+');
        Route::get('/members/check-duplicate', [MemberController::class, 'checkDuplicate']);
        
        // Members API Resource - must come after specific routes
        Route::apiResource('members', MemberController::class);

        // KYC Management
        Route::get('/kyc/pending', [KycController::class, 'pending']);
        Route::post('/kyc/{document}/approve', [KycController::class, 'approve']);
        Route::post('/kyc/{document}/reject', [KycController::class, 'reject']);

        // Wallets & Contributions
        Route::get('/wallets', [WalletController::class, 'index']);
        Route::post('/wallets', [WalletController::class, 'store']);
        Route::get('/wallets/{wallet}', [WalletController::class, 'show']);
        Route::post('/wallets/{wallet}/contributions', [WalletController::class, 'contribute']);
        Route::get('/members/{member}/penalties', [WalletController::class, 'penalties'])->where('member', '[0-9]+');
        Route::post('/members/{member}/sync-transactions', [WalletController::class, 'syncTransactions'])->where('member', '[0-9]+');

        // Payments
        Route::post('/payments/{payment}/receipt', [PaymentController::class, 'issueReceipt']);
        Route::post('/payments/reconcile', [PaymentController::class, 'reconcile']);
        Route::get('/payments/reconciliation-logs', [PaymentController::class, 'reconciliationLogs']);
        Route::post('/payments/{payment}/retry-reconciliation', [PaymentController::class, 'retryReconciliation']);

        // Investments
        Route::apiResource('investments', InvestmentController::class);
        Route::post('/investments/{investment}/calculate-roi', [InvestmentController::class, 'calculateRoi']);
        Route::get('/investments/{investment}/roi-history', [InvestmentController::class, 'roiHistory']);
        Route::post('/investments/{investment}/payout/{payout}', [InvestmentController::class, 'payout']);

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

        // Scheduled Reports
        Route::apiResource('scheduled-reports', \App\Http\Controllers\ScheduledReportController::class);
        Route::post('/scheduled-reports/{scheduledReport}/run-now', [\App\Http\Controllers\ScheduledReportController::class, 'runNow']);
        Route::post('/scheduled-reports/{scheduledReport}/toggle-status', [\App\Http\Controllers\ScheduledReportController::class, 'toggleStatus']);

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
        Route::post('/transactions/unarchive-bulk', [TransactionController::class, 'bulkUnarchive']);
        Route::post('/transactions/{transaction}/archive', [TransactionController::class, 'archive']);
        Route::delete('/transactions/{transaction}/archive', [TransactionController::class, 'unarchive']);
        Route::post('/transactions/{transaction}/ask-ai', [TransactionController::class, 'askAi']);

        // Expenses
        Route::apiResource('expenses', ExpenseController::class);
        Route::post('/expenses/{expense}/approve', [ExpenseController::class, 'approve']);
        Route::post('/expenses/{expense}/reject', [ExpenseController::class, 'reject']);
        
        // Invoices
        Route::apiResource('invoices', InvoiceController::class);
        Route::post('/invoices/{invoice}/mark-paid', [InvoiceController::class, 'markAsPaid']);
        Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);
        Route::post('/invoices/bulk-match', [InvoiceController::class, 'bulkMatch']);
        Route::get('/invoices/members-summary', [InvoiceController::class, 'membersWithInvoices']);

        // Invoice Types
        Route::apiResource('invoice-types', InvoiceTypeController::class);
        
        // Invoice Reports
        Route::get('/invoice-reports/outstanding', [InvoiceReportController::class, 'outstandingInvoices']);
        Route::get('/invoice-reports/payment-collection', [InvoiceReportController::class, 'paymentCollection']);
        Route::get('/invoice-reports/member-compliance', [InvoiceReportController::class, 'memberCompliance']);
        Route::get('/invoice-reports/weekly-summary', [InvoiceReportController::class, 'weeklySummary']);

        // Manual Contributions
        Route::apiResource('manual-contributions', ManualContributionController::class);
        Route::post('/manual-contributions/import-excel', [ManualContributionController::class, 'importExcel']);

        // Meeting attendance uploads
        Route::get('/attendance-uploads/{attendanceUpload}/download', [MeetingAttendanceUploadController::class, 'download']);
        Route::apiResource('attendance-uploads', MeetingAttendanceUploadController::class)->only(['index', 'store', 'show', 'destroy']);

        // Settings
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
        Route::post('/settings', [SettingController::class, 'update']); // POST for file uploads

        // Reports
        Route::get('/reports/summary', [ReportController::class, 'summary']);
        Route::get('/reports/contributions', [ReportController::class, 'contributions']);
        Route::get('/reports/deposits', [ReportController::class, 'deposits']);
        Route::get('/reports/expenses', [ReportController::class, 'expenses']);
        Route::get('/reports/defaulters', [ReportController::class, 'defaulters']);
        Route::get('/reports/members', [ReportController::class, 'members']);
        Route::get('/reports/transactions', [ReportController::class, 'transactions']);
        Route::get('/reports/{type}/export', [ReportController::class, 'export'])->where('type', 'summary|contributions|deposits|expenses|members|transactions');

        // Accounting
        Route::post('/accounting/journal-entries', [AccountingController::class, 'createJournalEntry']);
        Route::post('/accounting/journal-entries/{entry}/post', [AccountingController::class, 'postJournalEntry']);
        Route::get('/accounting/general-ledger', [AccountingController::class, 'getGeneralLedger']);
        Route::get('/accounting/trial-balance', [AccountingController::class, 'getTrialBalance']);
        Route::get('/accounting/profit-loss', [AccountingController::class, 'getProfitAndLoss']);
        Route::get('/accounting/cash-flow', [AccountingController::class, 'getCashFlow']);
        Route::get('/accounting/chart-of-accounts', [AccountingController::class, 'getChartOfAccounts']);
        Route::get('/accounting/periods', [AccountingController::class, 'getAccountingPeriods']);

        // Duplicates
        Route::get('/duplicates', [DuplicateController::class, 'index']);
        Route::post('/duplicates/reanalyze', [DuplicateController::class, 'reanalyze']);

        // SMS
        Route::get('/sms/logs', [SmsController::class, 'logs']);
        Route::get('/sms/statistics', [SmsController::class, 'statistics']);
        Route::post('/sms/bulk', [SmsController::class, 'sendBulk']);
        Route::post('/sms/members/{member}', [SmsController::class, 'sendSingle'])->where('member', '[0-9]+');

        // Email
        Route::get('/emails/logs', [\App\Http\Controllers\EmailController::class, 'logs']);
        Route::get('/emails/statistics', [\App\Http\Controllers\EmailController::class, 'statistics']);
        Route::post('/emails/bulk', [\App\Http\Controllers\EmailController::class, 'sendBulk']);

        // Notifications
        Route::post('/notifications/whatsapp/send', [\App\Http\Controllers\NotificationController::class, 'sendWhatsApp']);
        Route::get('/notifications/whatsapp/logs', [\App\Http\Controllers\NotificationController::class, 'getWhatsAppLogs']);
        Route::post('/statements/send-monthly', [\App\Http\Controllers\NotificationController::class, 'sendMonthlyStatements']);
        Route::post('/contributions/send-reminders', [\App\Http\Controllers\NotificationController::class, 'sendContributionReminders']);

        // Audits
        Route::get('/audits', [AuditController::class, 'index']);
        Route::get('/audits/{auditRun}', [AuditController::class, 'show']);
        Route::post('/audits/contributions', [AuditController::class, 'upload']);
        Route::post('/audits/{auditRun}/reanalyze', [AuditController::class, 'reanalyze']);
        Route::delete('/audits/{auditRun}', [AuditController::class, 'destroy']);
        // IMPORTANT: Specific routes must come before parameterized routes to avoid conflicts
        Route::get('/audits/member/pending-profile-changes', [AuditController::class, 'pendingProfileChangesAudit']);
        Route::get('/audits/member/{member}', [AuditController::class, 'memberResults']);
        Route::post('/audits/statements', [AuditController::class, 'auditStatements']);

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
            Route::post('/staff/{user}/send-credentials', [StaffController::class, 'sendCredentials']);

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
