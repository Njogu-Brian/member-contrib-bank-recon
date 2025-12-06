# TestSprite Documentation - Evimeria System
## Comprehensive Backend, Frontend, and Mobile App Functionality Guide

**Last Updated**: January 2025  
**System Version**: 2.0.0  
**Project**: Evimeria Member Contributions System

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Backend API Documentation](#backend-api-documentation)
3. [Frontend Application Documentation](#frontend-application-documentation)
4. [Mobile Application Documentation](#mobile-application-documentation)
5. [Data Models & Relationships](#data-models--relationships)
6. [Testing Guidelines](#testing-guidelines)

---

## System Overview

The Evimeria System is a comprehensive financial management platform for chamas (savings groups) with the following components:

- **Backend**: Laravel 10 RESTful API with Sanctum authentication
- **Frontend**: React 18 SPA with Vite, TanStack Query, Tailwind CSS
- **Mobile App**: React Native application for member access
- **Key Features**: Bank statement reconciliation, member management, invoice generation, expense tracking, investment management, KYC compliance, meeting management, and more

### Technology Stack

**Backend:**
- PHP 8.1+, Laravel 10
- MySQL 8.0+
- Laravel Sanctum for authentication
- Python 3.8+ for OCR parsing (PDFPlumber)
- Queue workers for background processing

**Frontend:**
- React 18, Vite
- TanStack Query (React Query)
- Tailwind CSS
- React Router v6
- react-pdf for PDF viewing

**Mobile:**
- React Native
- React Navigation
- React Native Paper

---

## Backend API Documentation

### Base URL
```
/api/v1
```

### Authentication
All protected routes require Bearer token authentication via Laravel Sanctum:
```
Authorization: Bearer {token}
```

---

### 1. Public Endpoints (No Authentication Required)

#### Health Check
```
GET /api/v1/public/health
```
Returns system status and timestamp.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX 12:00:00"
}
```

#### Test Endpoint
```
GET /api/v1/public/test
```
Returns simple confirmation message.

#### Public Settings
```
GET /api/v1/public/settings
```
Returns public settings (logo, favicon, branding) for login page.

#### Public Dashboard Snapshot
```
GET /api/v1/public/dashboard/snapshot
```
Returns public dashboard statistics for login page display.

#### Public Announcements
```
GET /api/v1/public/announcements
```
Returns public announcements list.

#### Public Member Statement
```
GET /api/v1/public/statement/{token}
GET /api/v1/public/statement/{token}/pdf
```
View member statement using secure token (for SMS links).

#### Public Profile Management
```
GET /api/v1/public/profile/{token}/status
POST /api/v1/public/profile/{token}/update
```
Check profile update status and submit profile updates without authentication.

---

### 2. Webhook Endpoints

#### MPESA Payment Callback
```
POST /api/v1/webhooks/payments/mpesa/callback
```
Receives MPESA payment callbacks for automatic reconciliation.

---

### 3. Mobile API Endpoints (`/api/v1/mobile`)

#### Authentication

**Login**
```
POST /api/v1/mobile/auth/login
```
Body: `email`, `password`, `device_name`

**Register**
```
POST /api/v1/mobile/auth/register
```
Body: `name`, `email`, `password`, `phone`, `id_number`, etc.

**Get Current User** (Protected)
```
GET /api/v1/mobile/auth/me
```

**Logout** (Protected)
```
POST /api/v1/mobile/auth/logout
```

**KYC Profile** (Protected)
```
GET /api/v1/mobile/kyc/profile
PUT /api/v1/mobile/kyc/profile
POST /api/v1/mobile/kyc/documents
POST /api/v1/mobile/kyc/documents/front-id
POST /api/v1/mobile/kyc/documents/back-id
POST /api/v1/mobile/kyc/documents/kra-pin
POST /api/v1/mobile/kyc/documents/profile-photo
```

**MFA (Multi-Factor Authentication)** (Protected)
```
POST /api/v1/mobile/mfa/enable
POST /api/v1/mobile/mfa/disable
GET /api/v1/mobile/mfa/setup
POST /api/v1/mobile/mfa/verify
```

#### Members (Protected)
```
GET /api/v1/mobile/members
GET /api/v1/mobile/members/{member}
GET /api/v1/mobile/members/{member}/statement/export
GET /api/v1/mobile/members/{member}/investment-report/export
```

#### Wallets (Protected)
```
GET /api/v1/mobile/wallets
GET /api/v1/mobile/wallets/{wallet}
POST /api/v1/mobile/wallets/{wallet}/contributions
```

#### Investments (Protected)
```
GET /api/v1/mobile/investments
POST /api/v1/mobile/investments
GET /api/v1/mobile/investments/{investment}
GET /api/v1/mobile/investments/{investment}/roi
```

#### Dashboard (Protected)
```
GET /api/v1/mobile/dashboard
```
Returns mobile dashboard data with member statistics, recent transactions, announcements.

#### Meetings & Voting (Protected)
```
GET /api/v1/mobile/meetings
POST /api/v1/mobile/motions/{motion}/vote
```

#### Announcements (Protected)
```
GET /api/v1/mobile/announcements
```

#### Notifications (Protected)
```
GET /api/v1/mobile/notifications
GET /api/v1/mobile/notifications/preferences
PUT /api/v1/mobile/notifications/preferences
```

#### Profile Management (Protected)
```
GET /api/v1/mobile/profile
PUT /api/v1/mobile/profile
POST /api/v1/mobile/profile/photo
```

#### Reports (Protected)
```
GET /api/v1/mobile/reports/investment
GET /api/v1/mobile/reports/statement
```

---

### 4. Web Authentication Endpoints (`/api/v1/auth`)

**Login**
```
POST /api/v1/auth/login
```
Body: `email`, `password`

**Register**
```
POST /api/v1/auth/register
```

**Password Reset Request**
```
POST /api/v1/auth/password/reset-request
```
Body: `email`

**Password Reset**
```
POST /api/v1/auth/password/reset
```
Body: `token`, `email`, `password`, `password_confirmation`

**Logout** (Protected)
```
POST /api/v1/auth/logout
```

**Get Current User** (Protected)
```
GET /api/v1/auth/me
```

**Change Password** (Protected)
```
POST /api/v1/auth/password/change
```
Body: `current_password`, `password`, `password_confirmation`

**MFA Setup** (Protected)
```
GET /api/v1/auth/mfa/setup
POST /api/v1/auth/mfa/enable
POST /api/v1/auth/mfa/disable
POST /api/v1/auth/mfa/verify
```

---

### 5. Admin Protected Endpoints (`/api/v1/admin`)

All endpoints below require authentication and appropriate role permissions.

#### Dashboard
```
GET /api/v1/admin/dashboard
```
Returns comprehensive dashboard statistics, recent activities, financial summaries.

#### Members Management

**CRUD Operations**
```
GET /api/v1/admin/members
POST /api/v1/admin/members
GET /api/v1/admin/members/{member}
PUT /api/v1/admin/members/{member}
DELETE /api/v1/admin/members/{member}
```

**Special Member Operations**
```
GET /api/v1/admin/members/profile-update-status
POST /api/v1/admin/members/{member}/reset-profile-link
POST /api/v1/admin/members/reset-all-profile-links
POST /api/v1/admin/members/bulk-upload
GET /api/v1/admin/members/{member}/statement
GET /api/v1/admin/members/{member}/statement/export
GET /api/v1/admin/members/{member}/investment-report/export
GET /api/v1/admin/members/statements/export
POST /api/v1/admin/members/{member}/activate
```

**Pending Profile Changes**
```
GET /api/v1/admin/pending-profile-changes
GET /api/v1/admin/pending-profile-changes/statistics
POST /api/v1/admin/pending-profile-changes/{change}/approve
POST /api/v1/admin/pending-profile-changes/{change}/reject
POST /api/v1/admin/pending-profile-changes/member/{member}/approve-all
POST /api/v1/admin/pending-profile-changes/approve-all
```

#### KYC Management
```
GET /api/v1/admin/kyc/pending
POST /api/v1/admin/kyc/{document}/approve
POST /api/v1/admin/kyc/{document}/reject
```

#### Wallets & Contributions
```
GET /api/v1/admin/wallets
POST /api/v1/admin/wallets
GET /api/v1/admin/wallets/{wallet}
POST /api/v1/admin/wallets/{wallet}/contributions
GET /api/v1/admin/members/{member}/penalties
POST /api/v1/admin/members/{member}/sync-transactions
```

#### Payments & MPESA Reconciliation
```
POST /api/v1/admin/payments/{payment}/receipt
POST /api/v1/admin/payments/reconcile
GET /api/v1/admin/payments/reconciliation-logs
POST /api/v1/admin/payments/{payment}/retry-reconciliation
```

#### Investments
```
GET /api/v1/admin/investments
POST /api/v1/admin/investments
GET /api/v1/admin/investments/{investment}
PUT /api/v1/admin/investments/{investment}
DELETE /api/v1/admin/investments/{investment}
POST /api/v1/admin/investments/{investment}/calculate-roi
GET /api/v1/admin/investments/{investment}/roi-history
POST /api/v1/admin/investments/{investment}/payout/{payout}
```

#### Announcements
```
GET /api/v1/admin/announcements
POST /api/v1/admin/announcements
GET /api/v1/admin/announcements/{announcement}
PUT /api/v1/admin/announcements/{announcement}
DELETE /api/v1/admin/announcements/{announcement}
```

#### Notification Preferences
```
GET /api/v1/admin/notification-preferences
PUT /api/v1/admin/notification-preferences
GET /api/v1/admin/notifications/log
```

#### Meetings & Motions
```
GET /api/v1/admin/meetings
POST /api/v1/admin/meetings
POST /api/v1/admin/meetings/{meeting}/motions
POST /api/v1/admin/motions/{motion}/votes
```

#### Budgets
```
GET /api/v1/admin/budgets
POST /api/v1/admin/budgets
PUT /api/v1/admin/budget-months/{budgetMonth}
```

#### Report Exports
```
GET /api/v1/admin/report-exports
POST /api/v1/admin/report-exports
```

#### Scheduled Reports
```
GET /api/v1/admin/scheduled-reports
POST /api/v1/admin/scheduled-reports
GET /api/v1/admin/scheduled-reports/{scheduledReport}
PUT /api/v1/admin/scheduled-reports/{scheduledReport}
DELETE /api/v1/admin/scheduled-reports/{scheduledReport}
POST /api/v1/admin/scheduled-reports/{scheduledReport}/run-now
POST /api/v1/admin/scheduled-reports/{scheduledReport}/toggle-status
```

#### Contribution Status Rules
```
GET /api/v1/admin/contribution-statuses
POST /api/v1/admin/contribution-statuses
PUT /api/v1/admin/contribution-statuses/{contributionStatus}
DELETE /api/v1/admin/contribution-statuses/{contributionStatus}
POST /api/v1/admin/contribution-statuses/reorder
```

#### Bank Statements
```
GET /api/v1/admin/statements
POST /api/v1/admin/statements
GET /api/v1/admin/statements/{statement}
DELETE /api/v1/admin/statements/{statement}
POST /api/v1/admin/statements/upload
POST /api/v1/admin/statements/{statement}/reanalyze
POST /api/v1/admin/statements/reanalyze-all
GET /api/v1/admin/statements/{statement}/document-metadata
GET /api/v1/admin/statements/{statement}/document
```

#### Transactions
```
GET /api/v1/admin/transactions
GET /api/v1/admin/transactions/{transaction}
POST /api/v1/admin/transactions/{transaction}/assign
POST /api/v1/admin/transactions/{transaction}/split
POST /api/v1/admin/transactions/{transaction}/transfer
POST /api/v1/admin/transactions/auto-assign
POST /api/v1/admin/transactions/bulk-assign
POST /api/v1/admin/transactions/archive-bulk
POST /api/v1/admin/transactions/unarchive-bulk
POST /api/v1/admin/transactions/{transaction}/archive
DELETE /api/v1/admin/transactions/{transaction}/archive
POST /api/v1/admin/transactions/{transaction}/ask-ai
```

#### Expenses
```
GET /api/v1/admin/expenses
POST /api/v1/admin/expenses
GET /api/v1/admin/expenses/{expense}
PUT /api/v1/admin/expenses/{expense}
DELETE /api/v1/admin/expenses/{expense}
POST /api/v1/admin/expenses/{expense}/approve
POST /api/v1/admin/expenses/{expense}/reject
```

#### Invoices
```
GET /api/v1/admin/invoices
POST /api/v1/admin/invoices
GET /api/v1/admin/invoices/{invoice}
PUT /api/v1/admin/invoices/{invoice}
DELETE /api/v1/admin/invoices/{invoice}
POST /api/v1/admin/invoices/{invoice}/mark-paid
POST /api/v1/admin/invoices/{invoice}/cancel
POST /api/v1/admin/invoices/bulk-match
GET /api/v1/admin/invoices/members-summary
```

#### Invoice Types
```
GET /api/v1/admin/invoice-types
POST /api/v1/admin/invoice-types
GET /api/v1/admin/invoice-types/{invoiceType}
PUT /api/v1/admin/invoice-types/{invoiceType}
DELETE /api/v1/admin/invoice-types/{invoiceType}
```

#### Invoice Reports
```
GET /api/v1/admin/invoice-reports/outstanding
GET /api/v1/admin/invoice-reports/payment-collection
GET /api/v1/admin/invoice-reports/member-compliance
GET /api/v1/admin/invoice-reports/weekly-summary
```

#### Manual Contributions
```
GET /api/v1/admin/manual-contributions
POST /api/v1/admin/manual-contributions
GET /api/v1/admin/manual-contributions/{manualContribution}
PUT /api/v1/admin/manual-contributions/{manualContribution}
DELETE /api/v1/admin/manual-contributions/{manualContribution}
POST /api/v1/admin/manual-contributions/import-excel
```

#### Meeting Attendance Uploads
```
GET /api/v1/admin/attendance-uploads
POST /api/v1/admin/attendance-uploads
GET /api/v1/admin/attendance-uploads/{attendanceUpload}
DELETE /api/v1/admin/attendance-uploads/{attendanceUpload}
GET /api/v1/admin/attendance-uploads/{attendanceUpload}/download
```

#### Settings
```
GET /api/v1/admin/settings
PUT /api/v1/admin/settings
POST /api/v1/admin/settings  (for file uploads)
```

#### Reports
```
GET /api/v1/admin/reports/summary
GET /api/v1/admin/reports/contributions
GET /api/v1/admin/reports/deposits
GET /api/v1/admin/reports/expenses
GET /api/v1/admin/reports/defaulters
GET /api/v1/admin/reports/members
GET /api/v1/admin/reports/transactions
GET /api/v1/admin/reports/{type}/export
```
Where `{type}` can be: `summary`, `contributions`, `deposits`, `expenses`, `members`, `transactions`

#### Accounting
```
POST /api/v1/admin/accounting/journal-entries
POST /api/v1/admin/accounting/journal-entries/{entry}/post
GET /api/v1/admin/accounting/general-ledger
GET /api/v1/admin/accounting/trial-balance
GET /api/v1/admin/accounting/profit-loss
GET /api/v1/admin/accounting/cash-flow
GET /api/v1/admin/accounting/chart-of-accounts
GET /api/v1/admin/accounting/periods
```

#### Duplicates
```
GET /api/v1/admin/duplicates
POST /api/v1/admin/duplicates/reanalyze
```

#### SMS Management

**Send Bulk SMS**
```
POST /api/v1/admin/sms/bulk
```
Body:
- `member_ids` (array, optional): Array of member IDs
- `custom_numbers` (array, optional): Array of custom phone numbers (format: +254... or 0...)
- `message` (string, required, max: 1000): SMS message content with placeholders
- `sender_id` (string, optional, max: 11): Custom sender ID
- `include_contribution_status` (boolean): Include contribution status in message
- `include_statement_link` (boolean): Include statement link in message

**Message Placeholders** (automatically replaced for members):
- `{name}` - Member name
- `{phone}` - Member phone
- `{email}` - Member email
- `{member_code}` - Member code
- `{member_number}` - Member number
- `{total_contributions}` - Total contributions amount
- `{contribution_status}` - Contribution status label
- `{contribution_difference}` - Difference between contributions and invoices
- `{total_invoices}` - Total invoices amount
- `{pending_invoices}` - Pending invoices amount
- `{overdue_invoices}` - Overdue invoices amount
- `{paid_invoices}` - Paid invoices amount
- `{pending_invoice_count}` - Count of pending invoices
- `{oldest_invoice_number}` - Oldest invoice number
- `{oldest_invoice_due_date}` - Oldest invoice due date (formatted)
- `{statement_link}` - Public statement link (if enabled)

**Send Single SMS**
```
POST /api/v1/admin/sms/members/{member}
```
Body: `message`, `sender_id` (optional)

**Get SMS Logs**
```
GET /api/v1/admin/sms/logs
```
Query Parameters:
- `member_id` - Filter by member
- `status` - Filter by status (sent/failed)
- `date_from` - Start date
- `date_to` - End date
- `search` - Search in phone, message, error, member name/email
- `per_page` - Results per page (default: 25)

**Get SMS Statistics**
```
GET /api/v1/admin/sms/statistics
```
Query Parameters: `date_from`, `date_to`
Returns: `total`, `sent`, `failed`, `today`, `this_week`, `this_month`

**Features:**
- Bulk SMS to multiple members or custom numbers
- Message template with member-specific placeholders
- Automatic statement link generation for SMS
- Phone number validation (Kenyan format)
- SMS service status check before sending
- Comprehensive logging (success/failure)
- Statistics and analytics

#### Email Management

**Send Bulk Email**
```
POST /api/v1/admin/emails/bulk
```
Body:
- `member_ids` (array, optional): Array of member IDs
- `custom_emails` (array, optional): Array of custom email addresses
- `subject` (string, required, max: 255): Email subject with placeholders
- `message` (string, required): Email message content with placeholders
- `include_contribution_status` (boolean): Include contribution status in message
- `include_statement_link` (boolean): Include statement link in message

**Message Placeholders** (same as SMS, automatically replaced for members):
- `{name}`, `{phone}`, `{email}`, `{member_code}`, `{member_number}`
- `{total_contributions}`, `{contribution_status}`, `{contribution_difference}`
- `{total_invoices}`, `{pending_invoices}`, `{overdue_invoices}`, `{paid_invoices}`
- `{pending_invoice_count}`, `{oldest_invoice_number}`, `{oldest_invoice_due_date}`
- `{statement_link}` - Public statement link (if enabled)

**Get Email Logs**
```
GET /api/v1/admin/emails/logs
```
Query Parameters:
- `member_id` - Filter by member
- `status` - Filter by status (sent/failed)
- `date_from` - Start date
- `date_to` - End date
- `search` - Search in email, subject, message, error, member name/email
- `per_page` - Results per page (default: 25)

**Get Email Statistics**
```
GET /api/v1/admin/emails/statistics
```
Query Parameters: `date_from`, `date_to`
Returns: `total`, `sent`, `failed`, `today`, `this_week`, `this_month`

**Features:**
- Bulk email to multiple members or custom addresses
- Rich message templates with member-specific data
- HTML email support (if configured)
- Automatic statement link generation
- Email validation
- Comprehensive logging and error tracking
- Statistics and analytics

#### Notifications
```
POST /api/v1/admin/notifications/whatsapp/send
GET /api/v1/admin/notifications/whatsapp/logs
POST /api/v1/admin/statements/send-monthly
POST /api/v1/admin/contributions/send-reminders
```

#### Audits
```
GET /api/v1/admin/audits
GET /api/v1/admin/audits/{auditRun}
POST /api/v1/admin/audits/contributions
POST /api/v1/admin/audits/{auditRun}/reanalyze
DELETE /api/v1/admin/audits/{auditRun}
GET /api/v1/admin/audits/member/{member}
POST /api/v1/admin/audits/statements
```

#### Admin Management (`/api/v1/admin/admin`)

**Staff Management**
```
GET /api/v1/admin/admin/staff
POST /api/v1/admin/admin/staff
GET /api/v1/admin/admin/staff/{user}
PUT /api/v1/admin/admin/staff/{user}
DELETE /api/v1/admin/admin/staff/{user}
POST /api/v1/admin/admin/staff/{user}/reset-password
POST /api/v1/admin/admin/staff/{user}/toggle-status
POST /api/v1/admin/admin/staff/{user}/send-credentials
```

**Role Management**
```
GET /api/v1/admin/admin/roles
POST /api/v1/admin/admin/roles
GET /api/v1/admin/admin/roles/{role}
PUT /api/v1/admin/admin/roles/{role}
DELETE /api/v1/admin/admin/roles/{role}
```

**Permission Management**
```
GET /api/v1/admin/admin/permissions
POST /api/v1/admin/admin/permissions
GET /api/v1/admin/admin/permissions/{permission}
PUT /api/v1/admin/admin/permissions/{permission}
DELETE /api/v1/admin/admin/permissions/{permission}
```

**Activity Logs**
```
GET /api/v1/admin/admin/activity-logs
GET /api/v1/admin/admin/activity-logs/statistics
GET /api/v1/admin/admin/activity-logs/{activityLog}
```

**Admin Settings**
```
GET /api/v1/admin/admin/settings
PUT /api/v1/admin/admin/settings
POST /api/v1/admin/admin/settings  (for file uploads)
```

---

## Frontend Application Documentation

### Frontend Structure

The frontend is a React 18 Single Page Application (SPA) built with:
- **Router**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS
- **UI Components**: Custom components in `/src/ui`
- **Authentication**: Context-based auth with token management
- **RBAC**: Role-based access control with permission guards

### Frontend Routes & Pages

#### Public Routes (No Authentication)

**Login Page** (`/login`)
- User authentication
- Password strength indicator
- Remember me functionality
- Public dashboard snapshot display
- Public announcements display

**Forgot Password** (`/forgot-password`)
- Password reset request form
- Email validation

**Reset Password** (`/reset-password`)
- Password reset form with token
- New password confirmation

**Public Statement** (`/s/:token`)
- Public member statement view (no auth required)
- PDF export functionality
- Accessed via SMS links

**Unauthorized** (`/unauthorized`)
- Access denied page

#### Protected Routes (Authentication Required)

**Dashboard** (`/`)
- Overview statistics (total members, contributions, investments)
- Recent transactions
- Pending approvals (expenses, KYC)
- Quick actions
- Financial summaries (charts)
- Activity feed

**Members Management** (`/members`)
- Members list with search, filters, pagination
- Member creation form
- Member edit functionality
- Member status management (active/inactive)
- KYC status display
- Bulk upload (Excel)
- Export functionality

**Profile Update Status** (`/members/profile-update-status`)
- Track member profile update requests
- View pending profile changes
- Statistics dashboard

**Pending Profile Changes** (`/members/pending-profile-changes`)
- List of all pending profile update requests
- Approve/reject individual changes
- Bulk approval
- Member-specific approval
- Statistics view

**Member Profile** (`/members/:id`)
- Individual member details
- Statement view
- Transaction history
- Contribution history
- Investment history
- Profile edit
- Statement export (PDF/Excel)
- Investment report export
- Activate member (KYC)

**Bank Statements** (`/statements`)
- List all uploaded bank statements
- Statement upload (PDF)
- Statement viewer
- Reanalysis functionality
- Document metadata view
- Statement status (processed/pending/error)
- Date range filtering

**Statement Viewer** (`/statements/:id`)
- View statement details
- View transactions in statement
- Download original document
- Reanalyze statement

**Statement Transactions** (`/statements/:id/transactions`)
- Transactions within a statement
- Transaction assignment
- Filters and search

**Transactions** (`/transactions`)
- All transactions list
- Search and filters (member, date range, amount, status)
- Transaction assignment (manual/auto)
- Transaction splitting
- Transaction transfer
- Bulk operations (assign, archive)
- AI-assisted assignment
- Export functionality
- Sorting (date, amount, member)
- Pagination (25/50/100/200 per page)

**Archived Transactions** (`/archived-transactions`)
- View archived transactions
- Unarchive functionality
- Archive reason display

**Draft Transactions** (`/draft-transactions`)
- Transactions with draft assignments
- Multiple member suggestions
- Review and confirm

**Duplicate Transactions** (`/duplicate-transactions`)
- Detect duplicate transactions
- Review and merge/archive duplicates
- Reanalyze for duplicates

**Expenses** (`/expenses`)
- Expense list (requires: Super Admin, Treasurer, Group Treasurer, Accountant)
- Create expense
- Expense approval workflow
- Expense categories
- Approval hierarchy (prevents self-approval)
- Filters (status, date range, amount)
- Export functionality

**Manual Contributions** (`/manual-contributions`)
- Manual contribution entry (requires: Super Admin, Treasurer, Group Treasurer)
- Excel import
- Bulk creation
- Member selection
- Amount entry
- Notes/description

**Invoices** (`/invoices`)
- Invoice list (requires: Super Admin, Treasurer, Group Treasurer, Accountant)
- Invoice creation
- Invoice types selection
- Mark as paid
- Cancel invoice
- Bulk matching with transactions
- Members summary
- Filters (status, date, member)
- Export functionality

**Invoice Types** (`/invoice-types`)
- Manage invoice types (requires: Super Admin, Treasurer, Group Treasurer, Accountant)
- Create/edit/delete types
- Set default amounts
- Frequency settings

**Wallets** (`/wallets`)
- Wallet list
- Wallet creation
- Wallet contributions
- Member wallet assignments
- Penalty tracking
- Sync transactions

**Investments** (`/investments`)
- Investment list (requires: Super Admin, Treasurer, Accountant)
- Create investment
- ROI calculation
- ROI history
- Investment payout
- Investment details

**Announcements** (`/announcements`)
- Announcement list (requires: Super Admin, Chairman, Secretary)
- Create/edit/delete announcements
- Publish/unpublish
- Target audience selection
- Rich text editor

**Meetings & Voting** (`/meetings`)
- Meeting list (requires: Super Admin, Chairman, Secretary)
- Create meetings
- Add motions to meetings
- Voting functionality
- Vote tracking
- Results display

**Budgets** (`/budgets`)
- Budget management (requires: Super Admin, Chairman, Treasurer, Accountant)
- Create budgets
- Monthly budget tracking
- Budget vs actual comparisons
- Update budget months

**Reports** (`/reports`)
- Report dashboard
- Available reports:
  - Summary Report
  - Contributions Report
  - Deposits Report
  - Expenses Report
  - Defaulters Report
  - Members Report
  - Transactions Report
- Export (PDF/Excel/CSV)
- Date range filtering
- Custom filters

**Scheduled Reports** (`/scheduled-reports`)
- Schedule automated reports (requires: Super Admin, Treasurer, Accountant)
- Email delivery
- Frequency settings
- Run now functionality
- Toggle active/inactive

**Accounting** (`/accounting`)
- Accounting module (requires: Super Admin, Treasurer, Accountant)
- Chart of Accounts
- Journal Entries
- General Ledger
- Trial Balance
- Profit & Loss Statement
- Cash Flow Statement
- Accounting Periods
- Post journal entries

**MPESA Reconciliation** (`/mpesa-reconciliation`)
- MPESA payment reconciliation (requires: Super Admin, Treasurer)
- View reconciliation logs
- Retry failed reconciliations
- Manual reconciliation
- Payment matching

**Notifications** (`/notifications`)
- Notification preferences
- Notification log
- Enable/disable notification types
- Email/SMS/WhatsApp preferences

**Bulk SMS** (`/bulk-sms`)
- Send bulk SMS (requires: Super Admin, Secretary, Chairman)
- Select members or custom phone numbers
- Message template with dynamic placeholders:
  - Member information (name, phone, email, codes)
  - Financial data (contributions, invoices, status)
  - Statement links (automatic generation)
- Phone number validation (Kenyan format: +254 or 0 prefix)
- SMS service status check
- Message preview before sending
- Comprehensive SMS logs with search/filter
- Statistics dashboard (total, sent, failed, time periods)
- Export logs functionality
- Retry failed messages

**Bulk Email** (`/bulk-email`)
- Send bulk emails (requires: Super Admin, Secretary, Chairman)
- Select members or custom email addresses
- Rich email templates with dynamic placeholders:
  - Member information (name, phone, email, codes)
  - Financial data (contributions, invoices, status)
  - Statement links (automatic generation)
- Subject and message customization
- HTML email support
- Email validation
- Comprehensive email logs with search/filter
- Statistics dashboard (total, sent, failed, time periods)
- Export logs functionality
- Error tracking and retry capability

**Compliance** (`/compliance`)
- Compliance dashboard (requires: Super Admin, IT Support)
- KYC status overview
- Member activation tracking
- Compliance reports

**KYC Management** (`/kyc-management`)
- Pending KYC documents (requires: Super Admin, Treasurer)
- Approve/reject KYC documents
- Document types:
  - National ID (front/back)
  - Passport
  - Driver's License
  - KRA PIN
  - Profile Photo
- Activation workflow

**Attendance Uploads** (`/attendance-uploads`)
- Upload meeting attendance (requires: Super Admin, Secretary)
- Download attendance files
- Attendance tracking

**Audit Trails** (`/audit`)
- Audit run history (requires: Super Admin, Accountant, Guest)
- Upload contribution audit file
- Audit results
- Member-specific audit results
- Statement audits
- Reanalyze audits

**Settings** (`/settings`)
- System settings (requires: Super Admin)
- Branding (logo, favicon)
- Email configuration
- SMS configuration
- General settings
- Feature flags

**Staff Management** (`/admin/staff`)
- Staff user list (requires: Super Admin)
- Create staff users
- Edit staff
- Reset passwords
- Toggle active status
- Send credentials
- Role assignment

**Role Management** (`/admin/roles`)
- Role list (requires: Super Admin)
- Create/edit/delete roles
- Permission assignment
- Role description

**Activity Logs** (`/admin/activity-logs`)
- System activity logs (requires: Super Admin, IT Support)
- User actions tracking
- Statistics
- Filter by user, action, date

**Change Password** (`/change-password`)
- Change user password
- Current password verification
- Password strength requirements

**MFA Setup** (`/mfa-setup`)
- Multi-factor authentication setup
- QR code display
- Backup codes
- Enable/disable MFA

**UI Kit** (`/ui-kit`)
- Component library (requires: Super Admin, IT Support)
- Design system showcase
- Component examples

---

## Mobile Application Documentation

### Mobile App Structure

The mobile app is built with React Native and includes:
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: React Context + TanStack Query
- **UI Components**: React Native Paper
- **Authentication**: Token-based with Sanctum

### Mobile App Screens

#### Authentication Screens

**Login Screen** (`LoginScreen`)
- Email and password login
- Device registration
- Remember me functionality
- Navigate to registration

**Register Screen** (`RegisterScreen`)
- Member registration form
- Validation
- Navigate to login

**MFA Screen** (`MFAScreen`)
- Multi-factor authentication entry
- TOTP code input
- Backup code option

#### Main Tabs (Bottom Navigation)

**Dashboard Tab** (`DashboardScreen`)
- Member overview statistics
- Total contributions
- Current balance
- Investment summary
- Quick actions:
  - Make Payment
  - View Statement
  - Announcements
  - Meetings
- Recent transactions list

**Contributions Tab** (`ContributionsScreen`)
- Contribution history
- Make payment button
- Payment methods
- Contribution amounts
- Date and status

**Wallet Tab** (`WalletScreen`)
- Wallet balance
- Transaction history
- View statement button
- Wallet details
- Contribution summary

**Investments Tab** (`InvestmentsScreen`)
- Investment list
- ROI display
- Investment details
- Create investment (if allowed)
- Investment history

**Profile Tab** (`ProfileScreen`)
- User profile information
- Edit profile
- KYC status
- Documents upload
- MFA settings
- Notification preferences
- Logout

#### Additional Screens (Stack Navigation)

**Statement Screen** (`StatementScreen`)
- Full statement view
- Transaction details
- Date range
- Export options
- PDF view

**Payment Screen** (`PaymentScreen`)
- Make contribution payment
- Amount input
- Payment method selection
- Wallet selection
- Confirmation

**Announcements Screen** (`AnnouncementsScreen`)
- List of announcements
- Read announcements
- Date and priority
- Full announcement view

**Meetings Screen** (`MeetingsScreen`)
- Upcoming meetings list
- Meeting details
- Motions list
- Voting functionality
- Meeting results

### Mobile API Integration

The mobile app uses the `/api/v1/mobile` endpoints for all data operations. All endpoints require authentication except login and register.

Key features:
- Automatic token refresh
- Offline data caching
- Pull-to-refresh
- Infinite scroll for lists
- Image upload for KYC documents
- PDF viewing for statements

---

## Data Models & Relationships

### Core Models

**User**
- Fields: `id`, `name`, `email`, `password`, `is_active`, `member_id`, `phone`, `last_login_at`, `must_change_password`, `password_changed_at`
- Relationships:
  - `belongsToMany(Role)` - User roles
  - `hasOne(UserProfile)` - User profile
  - `hasMany(KycDocument)` - KYC documents
  - `hasOne(MfaSecret)` - MFA secret
  - `hasOne(NotificationPreference)` - Notification preferences
  - `belongsTo(Member)` - Linked member (optional)

**Member**
- Fields: `id`, `name`, `phone`, `email`, `id_number`, `member_code`, `member_number`, `is_active`, `kyc_status`, `kyc_approved_at`, `public_share_token`, etc.
- Relationships:
  - `hasMany(Transaction)` - Bank transactions
  - `hasMany(ManualContribution)` - Manual contributions
  - `hasMany(TransactionSplit)` - Transaction splits
  - `hasMany(Expense)` - Expenses
  - `hasMany(Invoice)` - Invoices
  - `hasMany(Investment)` - Investments
  - `hasMany(KycDocument)` - KYC documents
  - `hasMany(WalletMember)` - Wallet memberships

**Transaction**
- Fields: `id`, `bank_statement_id`, `tran_date`, `value_date`, `particulars`, `transaction_type`, `credit`, `debit`, `balance`, `member_id`, `assignment_status`, `match_confidence`, `is_archived`
- Relationships:
  - `belongsTo(BankStatement)` - Source statement
  - `belongsTo(Member)` - Assigned member
  - `hasMany(TransactionMatchLog)` - Matching logs
  - `hasMany(TransactionSplit)` - Splits

**BankStatement**
- Fields: `id`, `filename`, `statement_date`, `period_start`, `period_end`, `balance`, `status`, `processed_at`
- Relationships:
  - `hasMany(Transaction)` - Transactions in statement

**Invoice**
- Fields: `id`, `member_id`, `invoice_type_id`, `invoice_number`, `amount`, `due_date`, `status`, `paid_at`, `payment_transaction_id`
- Relationships:
  - `belongsTo(Member)` - Member
  - `belongsTo(InvoiceType)` - Invoice type
  - `belongsTo(Transaction)` - Payment transaction

**Expense**
- Fields: `id`, `member_id`, `amount`, `description`, `category`, `status`, `approved_by`, `approved_at`, `rejected_reason`
- Relationships:
  - `belongsTo(Member)` - Requesting member
  - `belongsTo(User, 'approved_by')` - Approver

**Investment**
- Fields: `id`, `member_id`, `amount`, `investment_date`, `return_date`, `roi_percentage`, `status`
- Relationships:
  - `belongsTo(Member)` - Member investor
  - `hasMany(InvestmentPayout)` - Payouts

**Wallet**
- Fields: `id`, `name`, `description`, `wallet_type`, `is_active`
- Relationships:
  - `hasMany(WalletMember)` - Wallet members
  - `hasMany(Contribution)` - Contributions

**Role**
- Fields: `id`, `name`, `slug`, `description`
- Relationships:
  - `belongsToMany(User)` - Users with role
  - `belongsToMany(Permission)` - Permissions

**Permission**
- Fields: `id`, `name`, `slug`, `description`
- Relationships:
  - `belongsToMany(Role)` - Roles with permission

**KycDocument**
- Fields: `id`, `member_id`, `user_id`, `document_type`, `file_path`, `status`, `approved_at`, `approved_by`, `rejected_reason`, `rejected_at`
- Relationships:
  - `belongsTo(Member)` - Member
  - `belongsTo(User)` - User (for staff-uploaded docs)
  - `belongsTo(User, 'approved_by')` - Approver user

**PendingProfileChange**
- Fields: `id`, `member_id`, `field_name`, `old_value`, `new_value`, `status`, `approved_at`, `approved_by`, `rejected_at`, `rejected_by`, `rejection_reason`
- Relationships:
  - `belongsTo(Member)` - Member
  - `belongsTo(User, 'approved_by')` - Approver user
  - `belongsTo(User, 'rejected_by')` - Rejector user
- Purpose: Tracks member profile update requests from public profile update feature. Requires approval from administrators. Can be approved/rejected individually or in bulk.

**SmsLog**
- Fields: `id`, `member_id`, `phone`, `message`, `processed_message`, `status` (sent/failed), `response`, `error`, `sent_by`, `sent_at`, `created_at`
- Relationships:
  - `belongsTo(Member)` - Member (optional, null for custom numbers)
  - `belongsTo(User, 'sent_by')` - User who sent SMS

**EmailLog**
- Fields: `id`, `member_id`, `email`, `subject`, `message`, `processed_message`, `status` (sent/failed), `error`, `sent_by`, `sent_at`, `created_at`
- Relationships:
  - `belongsTo(Member)` - Member (optional, null for custom emails)
  - `belongsTo(User, 'sent_by')` - User who sent email

**Meeting**
- Fields: `id`, `title`, `date`, `location`, `agenda`, `status`
- Relationships:
  - `hasMany(Motion)` - Meeting motions

**Motion**
- Fields: `id`, `meeting_id`, `title`, `description`, `status`
- Relationships:
  - `belongsTo(Meeting)` - Meeting
  - `hasMany(Vote)` - Votes

**Announcement**
- Fields: `id`, `title`, `content`, `priority`, `target_audience`, `published_at`, `is_published`
- Relationships: None (standalone)

**JournalEntry**
- Fields: `id`, `entry_number`, `entry_date`, `period_id`, `description`, `is_posted`, `posted_at`
- Relationships:
  - `belongsTo(AccountingPeriod)` - Accounting period
  - `hasMany(JournalEntryLine)` - Entry lines
  - `belongsTo(User, 'created_by')` - Creator

**AccountingPeriod**
- Fields: `id`, `name`, `start_date`, `end_date`, `is_closed`
- Relationships:
  - `hasMany(JournalEntry)` - Journal entries

**ChartOfAccount**
- Fields: `id`, `code`, `name`, `type`, `parent_id`, `is_active`
- Relationships:
  - `belongsTo(ChartOfAccount, 'parent_id')` - Parent account
  - `hasMany(ChartOfAccount, 'parent_id')` - Child accounts
  - `hasMany(JournalEntryLine)` - Journal entry lines

### Key Relationships Summary

- **User ↔ Member**: One-to-one optional (staff users may not have members)
- **Member ↔ Transaction**: One-to-many (member has many transactions)
- **Member ↔ Invoice**: One-to-many (member has many invoices)
- **Member ↔ Investment**: One-to-many (member has many investments)
- **Transaction ↔ BankStatement**: Many-to-one (transactions belong to statement)
- **Expense ↔ User**: Many-to-one (approved by user)
- **User ↔ Role**: Many-to-many (users have multiple roles)
- **Role ↔ Permission**: Many-to-many (roles have multiple permissions)

---

## Testing Guidelines

### TestSprite Configuration

For TestSprite testing, configure the following:

**Backend Type:**
- Type: `backend`
- Port: `8000` (default Laravel port) or check your `.env` file (`APP_PORT` or `php artisan serve --port`)
- Project Path: Absolute path to project root (e.g., `D:\Projects\Evimeria_System`)
- Local Service: Backend API must be running before bootstrap
- Base Path: `/api/v1` (all endpoints are prefixed)

**Frontend Type:**
- Type: `frontend`
- Port: `5173` (default Vite dev server port) or check `vite.config.js`
- Project Path: Absolute path to project root
- Local Service: Frontend dev server must be running (`npm run dev`)
- Base Path: `/` (React Router handles routing)

**Mobile App Type:**
- Type: `frontend` (React Native web version) or use backend API tests
- Port: Check Metro bundler port (default: `8081`) or `evimeria_mobile/app.json`
- Project Path: Absolute path to `evimeria_mobile` directory
- Alternative: Test mobile features via backend API endpoints (`/api/v1/mobile/*`)

### Test Scope Options

1. **Codebase**: Tests entire codebase functionality
   - All routes, endpoints, and features
   - Comprehensive functionality testing
   - Full regression testing

2. **Diff**: Tests only staged/uncommitted changes
   - Faster execution
   - Focused testing on modified code
   - Useful for pull request validation

### TestSprite Workflow

**Initial Setup:**
1. Ensure backend is running (`php artisan serve`)
2. Ensure frontend is running (`npm run dev`) if testing frontend
3. Database should be seeded with test data
4. Bootstrap TestSprite with correct port and type

**Test Execution:**
1. TestSprite analyzes codebase/PRD
2. Generates test plan
3. Executes tests automatically
4. Generates test report (Markdown format)
5. Identifies pass/fail scenarios

**Test Reports:**
- Saved in `testsprite_tests/` directory
- Includes detailed test results
- Screenshots for frontend tests
- API response validation for backend tests

### Authentication Testing

**Backend:**
- Most endpoints require authentication token
- Login endpoint: `POST /api/v1/auth/login`
- Mobile login: `POST /api/v1/mobile/auth/login`
- Token returned in response, use in `Authorization: Bearer {token}` header

**Test Users:**
- Admin: `admin@evimeria.com` (check seeders)
- Test members: See `MobileTestDataSeeder.php` and `NewFeaturesTestDataSeeder.php`

### Key Test Scenarios

#### Backend API Tests

1. **Authentication Flow**
   - Login (web and mobile)
   - Registration with validation
   - Password reset flow
   - MFA setup and verification (TOTP)
   - Token refresh and expiration
   - Session timeout handling
   - Logout functionality

2. **Member Management**
   - CRUD operations (create, read, update, delete)
   - Member search and filtering
   - Bulk upload (Excel import)
   - Profile update requests and approval
   - KYC document upload and approval/rejection
   - Member activation workflow
   - Profile link reset (individual and bulk)
   - Member statements and exports
   - Duplicate ID number prevention

3. **Financial Operations**
   - Bank statement upload (PDF)
   - OCR parsing and transaction extraction
   - Statement reanalysis
   - Transaction assignment (auto/manual/split)
   - AI-assisted transaction assignment
   - Transaction archiving/unarchiving
   - Invoice generation (weekly automation)
   - Invoice status management (pending/paid/overdue/cancelled)
   - Invoice bulk matching
   - Expense creation and approval workflow
   - Expense rejection with reason
   - Self-approval prevention
   - Investment creation and ROI calculation
   - Investment payout processing
   - Manual contribution entry
   - Payment reconciliation (MPESA)
   - Wallet contributions
   - Transaction splitting and transfer

4. **Communication & Notifications**
   - Bulk SMS with placeholders
   - Bulk email with placeholders
   - SMS/Email logs and statistics
   - Message template processing
   - Statement link generation
   - WhatsApp notifications
   - Monthly statement sending
   - Contribution reminders
   - Notification preferences management

5. **Reporting & Analytics**
   - Summary report
   - Contributions report
   - Deposits report
   - Expenses report
   - Defaulters report
   - Members report
   - Transactions report
   - Investment reports
   - Invoice reports (outstanding, collection, compliance, weekly)
   - Export functionality (PDF/Excel/CSV)
   - Scheduled reports (daily/weekly/monthly/quarterly/yearly)
   - Report filters and date ranges

6. **Accounting**
   - Chart of accounts management
   - Journal entry creation
   - Journal entry posting
   - General ledger view
   - Trial balance generation
   - Profit & Loss statement
   - Cash flow statement
   - Accounting periods management

7. **Admin Functions**
   - Staff user management (CRUD)
   - Staff password reset
   - Staff status toggle
   - Credential sending
   - Role management (CRUD)
   - Permission management (CRUD)
   - Role-permission assignment
   - Settings management (general, branding, email, SMS)
   - Activity logs viewing and filtering
   - Admin settings management

8. **Meeting & Engagement**
   - Meeting creation and management
   - Motion creation and voting
   - Vote tracking and results
   - Meeting attendance uploads
   - Announcement creation and publishing
   - Announcement targeting

9. **Compliance & Auditing**
   - KYC document management
   - Pending profile changes approval
   - Audit trail tracking
   - Contribution audits
   - Statement audits
   - Duplicate transaction detection
   - Activity logging

10. **Wallets & Budgets**
    - Wallet creation and management
    - Wallet member assignments
    - Wallet contributions
    - Penalty tracking
    - Budget creation
    - Monthly budget tracking
    - Budget vs actual comparisons

#### Frontend Tests

1. **Navigation**
   - All routes accessible with proper permissions
   - Protected routes redirect when unauthorized
   - Public routes accessible without auth

2. **User Interactions**
   - Form submissions
   - Search and filters
   - Pagination
   - Export actions
   - File uploads

3. **State Management**
   - Data fetching with TanStack Query
   - Loading states
   - Error handling
   - Optimistic updates

4. **RBAC**
   - Menu items show/hide based on roles
   - Action buttons disabled based on permissions
   - Unauthorized access blocked

#### Mobile App Tests

1. **Authentication**
   - Login/logout flow
   - Registration
   - MFA verification

2. **Navigation**
   - Tab navigation
   - Stack navigation
   - Deep linking

3. **Data Display**
   - Dashboard statistics
   - Transaction lists
   - Statement view
   - Profile information

4. **Actions**
   - Make payment
   - View statements
   - Upload documents
   - Vote on motions

### Test Data Setup

Before running tests, ensure:
1. Database is seeded: `php artisan migrate --seed`
2. Test users exist (check seeders)
3. Test members exist
4. Test transactions/statements available (optional)

### Common Test Patterns

**API Request Pattern:**
```javascript
// Example API test - Authentication
POST /api/v1/auth/login
Body: { email: "admin@test.com", password: "password" }
Response: { token: "...", user: {...} }

// Then use token in subsequent requests
GET /api/v1/admin/dashboard
Headers: { Authorization: "Bearer {token}" }

// Example - Bulk SMS
POST /api/v1/admin/sms/bulk
Headers: { Authorization: "Bearer {token}" }
Body: {
  member_ids: [1, 2, 3],
  message: "Hello {name}, your contribution status is {contribution_status}",
  include_statement_link: true,
  include_contribution_status: true
}

// Example - Transaction Assignment
POST /api/v1/admin/transactions/{transaction}/assign
Headers: { Authorization: "Bearer {token}" }
Body: { member_id: 5 }

// Example - Expense Approval
POST /api/v1/admin/expenses/{expense}/approve
Headers: { Authorization: "Bearer {token}" }
Body: { notes: "Approved for reimbursement" }
```

**Frontend Route Pattern:**
```
1. Navigate to /login
2. Enter credentials (with password strength indicator)
3. Submit form
4. Verify redirect to / (dashboard)
5. Verify dashboard data loads (statistics, recent transactions)
6. Verify navigation menu shows based on user roles
7. Test protected routes redirect to /unauthorized if no permission

Example - Bulk SMS Flow:
1. Navigate to /bulk-sms
2. Select members or enter custom numbers
3. Enter message with placeholders ({name}, {contribution_status})
4. Enable "Include statement link" if needed
5. Preview message (if available)
6. Submit and verify success message
7. Check SMS logs page for delivery status

Example - Transaction Assignment Flow:
1. Navigate to /transactions
2. Search/filter unassigned transactions
3. Select transaction
4. Click "Assign" or "Auto Assign"
5. Select member from dropdown
6. Verify assignment success
7. Verify transaction status updates
```

**Mobile Flow Pattern:**
```
1. Open app
2. Navigate to Login screen (if not authenticated)
3. Enter credentials
4. Submit
5. Verify navigation to Main tabs (Dashboard/Contributions/Wallet/Investments/Profile)
6. Verify Dashboard tab shows data (statistics, recent transactions)
7. Test tab navigation between screens
8. Test stack navigation (from tabs to detail screens)

Example - Mobile Payment Flow:
1. Navigate to Contributions tab
2. Tap "Make Payment" button
3. Enter amount
4. Select wallet (if multiple)
5. Select payment method
6. Confirm payment
7. Verify payment success message
8. Verify transaction appears in Wallet tab

Example - Mobile KYC Upload Flow:
1. Navigate to Profile tab
2. Tap "Upload Documents"
3. Select document type (National ID, Passport, etc.)
4. Take photo or select from gallery
5. Upload front and back (if applicable)
6. Verify upload success
7. Check KYC status updates
```

---

## Additional Notes

### Role-Based Access Control (RBAC)

The system uses role-based permissions. Key roles:
- **Super Admin**: Full system access
- **Admin**: Administrative access
- **Treasurer**: Financial operations
- **Group Treasurer**: Group-level financial operations
- **Accountant**: Accounting and reporting
- **Chairman**: Meeting and announcement management
- **Secretary**: Administrative tasks, announcements
- **Member**: Basic member access (mobile app)

### Security Features

- Strong password validation (uppercase, lowercase, number, special char)
- Session timeout (120 minutes default)
- MFA support (TOTP)
- SQL injection prevention
- CSRF protection
- API rate limiting
- Secure file uploads
- Token-based authentication

### Scheduled Tasks

- **Daily**: Mark overdue invoices (midnight)
- **Weekly**: Generate invoices (Monday 6 AM)

### Environment Variables

Key environment variables to check:
- `APP_URL`: Application base URL
- `FRONTEND_URL`: Frontend URL for SMS/Email statement links
- `DB_DATABASE`: Database name
- `SANCTUM_STATEFUL_DOMAINS`: CORS configuration
- `SESSION_LIFETIME`: Session timeout in minutes (default: 120)
- SMS service credentials (provider-specific)
- Email service credentials (SMTP configuration)
- `QUEUE_CONNECTION`: Queue driver (database/redis/sync)
- `BROADCAST_DRIVER`: Broadcasting driver
- File storage configuration
- OCR parser service URL (if external)

### Message Placeholder Variables

Both SMS and Email support the following placeholders that are automatically replaced:

**Member Information:**
- `{name}` - Full member name
- `{phone}` - Primary phone number
- `{email}` - Email address
- `{member_code}` - Unique member code
- `{member_number}` - Member number

**Financial Information:**
- `{total_contributions}` - Total contributions amount (formatted with 2 decimals)
- `{contribution_status}` - Current contribution status label
- `{contribution_difference}` - Difference between contributions and total invoices
- `{total_invoices}` - Total of all invoices (formatted)
- `{pending_invoices}` - Total of pending invoices (formatted)
- `{overdue_invoices}` - Total of overdue invoices (formatted)
- `{paid_invoices}` - Total of paid invoices (formatted)
- `{pending_invoice_count}` - Number of pending invoices
- `{oldest_invoice_number}` - Invoice number of oldest pending invoice
- `{oldest_invoice_due_date}` - Due date of oldest invoice (formatted as "M d, Y")

**Links:**
- `{statement_link}` - Public statement URL (only if member has public_share_token and include_statement_link is enabled)

**Usage Example:**
```
Message: "Hello {name}, your total contributions are KES {total_contributions}. You have {pending_invoice_count} pending invoices. View your statement: {statement_link}"
```

### Contribution Status Rules

The system uses configurable contribution status rules that automatically classify members based on their contribution performance:

**Endpoints:**
- `GET /api/v1/admin/contribution-statuses` - List all rules
- `POST /api/v1/admin/contribution-statuses` - Create new rule
- `PUT /api/v1/admin/contribution-statuses/{id}` - Update rule
- `DELETE /api/v1/admin/contribution-statuses/{id}` - Delete rule
- `POST /api/v1/admin/contribution-statuses/reorder` - Reorder rules (priority)

**Features:**
- Rules are evaluated in order (priority)
- Each member gets assigned a status based on rules
- Status affects member display (colors, labels)
- Used in reports and filtering
- Supports custom conditions and thresholds

### Transaction Matching & Assignment

**Auto-Assignment:**
- Fuzzy matching based on phone numbers, amounts, dates
- Confidence scoring (0-100)
- Automatic assignment for high confidence matches
- Draft assignments for review when confidence is lower

**Manual Assignment:**
- Search members by name, phone, member code
- Direct assignment to member
- Transaction splitting (assign portions to multiple members)
- Transaction transfer (move assignment from one member to another)

**AI-Assisted Assignment:**
- `POST /api/v1/admin/transactions/{transaction}/ask-ai`
- Uses AI to suggest member assignment
- Analyzes transaction details and member history

**Bulk Operations:**
- Auto-assign all unassigned transactions
- Bulk assign selected transactions
- Bulk archive/unarchive transactions

### Invoice System

**Weekly Auto-Generation:**
- Scheduled task runs every Monday at 6 AM
- Generates invoices based on invoice types
- Respects member status and configuration

**Invoice Types:**
- Configurable types (e.g., "Weekly Contribution", "Penalty", etc.)
- Default amounts per type
- Frequency settings (weekly, monthly, etc.)
- Active/inactive status

**Invoice Matching:**
- Automatic matching with payments (MPESA reconciliation)
- Manual matching with transactions
- Bulk matching functionality

**Invoice Statuses:**
- `pending` - Newly created, not yet due
- `overdue` - Past due date, not paid
- `paid` - Successfully paid
- `cancelled` - Cancelled invoice

### Expense Approval Workflow

**Approval Hierarchy:**
- Expenses require approval from authorized roles
- Cannot self-approve (prevented by system)
- Approval roles: Super Admin, Treasurer, Group Treasurer, Accountant
- Rejection requires reason

**Expense Statuses:**
- `pending` - Awaiting approval
- `approved` - Approved for payment
- `rejected` - Rejected with reason

### Investment ROI Calculation

**ROI Features:**
- Automatic ROI calculation based on investment date
- ROI percentage tracking
- ROI history (time-based calculations)
- Payout tracking and management

**Endpoints:**
- `POST /api/v1/admin/investments/{investment}/calculate-roi` - Recalculate ROI
- `GET /api/v1/admin/investments/{investment}/roi-history` - View ROI history
- `POST /api/v1/admin/investments/{investment}/payout/{payout}` - Process payout

### Duplicate Detection

**Duplicate Transaction Detection:**
- Hash-based duplicate detection
- Detects transactions with same date, amount, particulars
- Reanalysis functionality
- Manual review and merge/archive options

**Endpoint:**
- `GET /api/v1/admin/duplicates` - List duplicate transactions
- `POST /api/v1/admin/duplicates/reanalyze` - Reanalyze for duplicates

### Bank Statement Processing

**OCR Parsing:**
- Python-based PDF parser (PDFPlumber)
- Extracts transactions from bank statements
- Handles various bank statement formats
- Supports both credit and debit transactions

**Processing Flow:**
1. Upload PDF statement
2. OCR extraction of transactions
3. Transaction data normalization
4. Duplicate detection
5. Auto-assignment attempt
6. Manual review and assignment

**Reanalysis:**
- Re-parse statement if parsing errors
- Re-analyze all statements (batch operation)
- Update transaction metadata

### Scheduled Reports

**Report Types:**
- `summary` - Overall system summary
- `contributions` - Contributions report
- `deposits` - Deposits report
- `expenses` - Expenses report
- `members` - Members report
- `transactions` - Transactions report

**Frequency Options:**
- `daily` - Daily reports
- `weekly` - Weekly reports
- `monthly` - Monthly reports
- `quarterly` - Quarterly reports
- `yearly` - Yearly reports

**Export Formats:**
- PDF
- Excel (XLSX)
- CSV

**Features:**
- Email delivery to recipients
- Custom filters per scheduled report
- Run now functionality (manual trigger)
- Active/inactive toggle

### Activity Logging

**Logged Actions:**
- User logins/logouts
- Member creation/updates
- Transaction assignments
- Expense approvals/rejections
- Invoice generation
- Settings changes
- Role/permission changes
- Staff management actions

**Activity Log Access:**
- Viewable by Super Admin and IT Support
- Filterable by user, action type, date range
- Statistics dashboard
- Detailed action history

---

## Conclusion

This documentation provides a comprehensive overview of all backend API endpoints, frontend pages, mobile app screens, data models, and testing guidelines for the Evimeria System. Use this as a reference when creating TestSprite test plans and executing tests.

For additional details, refer to:
- API documentation in Swagger/Postman (if available)
- Inline code comments
- Database schema migrations
- Component source code

**Document Version**: 1.1.0  
**Last Updated**: January 2025  
**Updated By**: AI Assistant

### Changelog

**v1.1.0 (January 2025)**
- Added detailed SMS and Email functionality documentation
- Enhanced API endpoint descriptions with request/response examples
- Added comprehensive message placeholder variables documentation
- Expanded test scenarios with detailed flow examples
- Added contribution status rules documentation
- Added transaction matching and assignment details
- Added invoice system workflow documentation
- Added expense approval workflow details
- Added investment ROI calculation features
- Added duplicate detection system documentation
- Added bank statement processing flow
- Added scheduled reports configuration
- Added activity logging details
- Enhanced TestSprite configuration guide
- Added test workflow documentation
- Fixed and expanded data model relationships

**v1.0.0 (January 2025)**
- Initial comprehensive documentation
- Backend API endpoints listing
- Frontend pages documentation
- Mobile app screens documentation
- Data models and relationships
- Basic testing guidelines
