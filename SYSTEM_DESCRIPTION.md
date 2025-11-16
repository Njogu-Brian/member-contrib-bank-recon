# Member Contribution Bank Reconciliation System - Complete Technical Documentation

## Executive Summary

The **Member Contribution Bank Reconciliation System** is a comprehensive full-stack application designed to automate the process of reconciling bank statement transactions with member contributions. The system ingests PDF bank statements (both M-Pesa Paybill and regular bank statements), extracts transaction data using OCR technology, automatically matches transactions to members using intelligent algorithms, and provides a user-friendly interface for review and manual assignment.

---

## 1. System Purpose & Business Value

### Primary Objectives

1. **Automate Bank Reconciliation**: Eliminate manual data entry from PDF bank statements
2. **Intelligent Transaction Matching**: Automatically match bank transactions to members using multiple matching strategies
3. **High Accuracy Auto-Assignment**: Achieve ~90% auto-assignment rate for M-Pesa Paybill transactions
4. **Manual Review Interface**: Provide tools for reviewing, editing, and manually assigning unmatched transactions
5. **Comprehensive Tracking**: Track all contributions, expenses, and manual entries with full audit trails

### Business Benefits

- **Time Savings**: Reduces hours of manual data entry to minutes of automated processing
- **Accuracy**: Eliminates human error in transaction extraction and matching
- **Scalability**: Handles large volumes of transactions efficiently
- **Audit Trail**: Complete history of all assignments and changes
- **Real-time Insights**: Dashboard with contribution statistics and trends

---

## 2. Core Features

### 2.1 Bank Statement Management

#### PDF Upload & Processing
- **Upload Interface**: Drag-and-drop or file picker for PDF bank statements
- **File Validation**: Checks file type, size, and basic integrity
- **Duplicate Detection**: Prevents processing the same statement twice using file hash
- **Status Tracking**: Real-time status updates (uploaded → processing → completed/failed)
- **Error Handling**: Detailed error messages for failed processing

#### Statement Types Supported
1. **M-Pesa Paybill Statements**
   - Structured table format with columns: Receipt No, Completion Time, Details, Paid In
   - Multi-page extraction with header detection
   - Transaction code extraction from Receipt No column
   - Account name and phone number extraction from Details column

2. **Regular Bank Statements**
   - Text-based extraction with pattern matching
   - OCR fallback for scanned/image-based PDFs
   - Flexible date format detection
   - Credit/debit/balance extraction

#### Processing Workflow
1. User uploads PDF → File stored in `storage/app/statements/`
2. `BankStatement` record created with status `uploaded`
3. `ProcessBankStatement` job queued for background processing
4. Queue worker picks up job → Status changes to `processing`
5. Python OCR parser extracts transactions
6. Transactions normalized and stored in database
7. Status updated to `completed` or `failed` with error message

### 2.2 Transaction Extraction & Parsing

#### OCR Parser (Python Service)

**Technology Stack:**
- `pdfplumber`: Primary PDF text/table extraction library
- `pytesseract` + `pdf2image`: OCR fallback for scanned PDFs
- Tesseract OCR engine: Open-source OCR engine

**Extraction Methods:**

1. **Structured Table Extraction (Paybill)**
   - Two-pass approach:
     - **Pass 1**: Identify Paybill document by detecting header row containing "Receipt No", "Paid In", "Completion Time"
     - **Pass 2**: Extract all data rows from all pages, handling:
       - Repeated headers on each page
       - Continuation tables with same column count
       - Transaction code patterns in first column
   - Validates data rows (skips header rows, empty rows, invalid dates)
   - Extracts: Receipt No (transaction code), Completion Time (date), Details (particulars), Paid In (credit amount)

2. **Text Extraction (Regular Statements)**
   - Primary: Direct text extraction using `page.extract_text()`
   - Secondary: Table extraction for structured data
   - Fallback: OCR if text extraction returns insufficient content (< 100 characters)
   - Pattern matching to identify transaction rows:
     - Date patterns (DD/MM/YYYY, DD-MM-YYYY, etc.)
     - Amount patterns (currency symbols, decimal points)
     - Transaction description patterns

3. **Transaction Row Detection**
   - Regex patterns to identify valid transaction rows
   - Filters out headers, footers, and non-transaction text
   - Extracts: date, value date, particulars, credit, debit, balance

**Output Format:**
```json
{
  "tran_date": "2025-10-31",
  "value_date": "2025-10-31",
  "particulars": "Pay Bill from 25472****176 - JOYCE NJAGI Acc. Joyce Njagi",
  "credit": 5000.0,
  "debit": 0.0,
  "balance": null,
  "transaction_code": "TJVMV8W9FC"
}
```

#### Transaction Normalization

**TransactionParserService** extracts structured data from transaction particulars:

- **Transaction Type Detection**: Identifies "M-Pesa Paybill", "Bank Transfer", etc.
- **Phone Number Extraction**: Extracts phone numbers (254XXXXXXXXX format)
- **Member Name Extraction**: Extracts account holder names
- **Member Number Extraction**: Extracts member codes/numbers
- **Transaction Code Extraction**: Extracts reference numbers (excluding phone numbers)
- **Last 3 Phone Digits**: Extracts last 3 digits for partial matching

**Normalization Functions:**
- `normalizePhone()`: Converts phone numbers to standard format (254XXXXXXXXX)
- `normalizeName()`: Removes extra spaces, converts to lowercase for comparison
- `compareNames()`: Fuzzy string matching using similarity algorithms

### 2.3 Intelligent Transaction Matching

#### Auto-Assignment Algorithm

The system uses a **multi-strategy matching approach** with priority ordering:

**Strategy 1: Phone Number Match (Highest Priority)**
- Exact phone match: `254XXXXXXXXX` → `254XXXXXXXXX`
- Last 9 digits match: `XXX254XXXXXXXXX` → `254XXXXXXXXX`
- **Result**: Auto-assign with 98% confidence if single match
- **Result**: Draft assign if multiple matches

**Strategy 1.5: Paybill Name + Phone Last 3 Digits (For M-Pesa Paybill)**
- Name fuzzy match (score ≥ 0.6) + Last 3 phone digits match
- **Result**: Auto-assign with 100% confidence if single match
- **Result**: Draft assign if multiple matches or phone mismatch
- **Target**: Achieve ~90% auto-assignment rate for Paybill transactions

**Strategy 2: Name Match**
- Fuzzy name matching using string similarity (score ≥ 0.6)
- Phone conflict detection: If transaction phone doesn't match member phone → Draft
- **Result**: Auto-assign if single match + high confidence (≥ 0.8) + no phone conflict
- **Result**: Draft assign if multiple matches or phone conflict

**Strategy 3: Member Number Match**
- Exact match on `member_number` or `member_code`
- **Result**: Auto-assign with 98% confidence

**Assignment Statuses:**
- `unassigned`: No match found
- `auto_assigned`: Automatically matched with high confidence
- `manual_assigned`: Manually assigned by user
- `draft`: Multiple potential matches or low confidence match

**Match Confidence Scoring:**
- Phone match: 0.98
- Paybill name + phone: 1.0 (100%)
- Member number: 0.98
- Name match (high): 0.8+
- Name match (moderate): 0.6-0.8

#### Matching Service (Node.js Microservice)

**Purpose**: Provides additional AI-powered matching capabilities (optional)

**Endpoints:**
- `POST /match-batch`: Batch matching for multiple transactions
- Uses `string-similarity` library for fuzzy matching
- Optional Cursor AI integration for advanced matching

**Integration:**
- Called from Laravel backend via HTTP
- Fallback to local matching if service unavailable
- Timeout handling (60 seconds)

### 2.4 Transaction Management

#### Transaction List & Filtering

**Filters:**
- Status: `unassigned`, `auto_assigned`, `manual_assigned`, `draft`, `flagged`
- Member: Filter by assigned member
- Bank Statement: Filter by source statement
- Search: Search by particulars, transaction code, or member name
- Date Range: Filter by transaction date

**Pagination:**
- Default: 20 transactions per page
- Configurable per_page parameter
- Ordered by transaction date (descending)

#### Manual Assignment

**Single Assignment:**
- Select transaction → Choose member → Assign
- Records assignment reason and confidence
- Creates `TransactionMatchLog` entry
- Updates assignment status to `manual_assigned`

**Bulk Assignment:**
- Select multiple transactions
- Assign to members in batch
- Error handling for individual failures
- Returns success count and error list

#### Transaction Splitting

**Feature**: Split a single transaction amount across multiple members

**Use Cases:**
- Joint contributions
- Shared payments
- Partial assignments

**Validation:**
- Split amounts must sum to exact transaction amount (within 0.01 tolerance)
- At least one split required
- Each split requires member and amount

**Implementation:**
- Creates `TransactionSplit` records linked to parent transaction
- Updates transaction status to `manual_assigned`
- Maintains relationship for reporting

#### AI Suggestions

**Feature**: Get AI-powered matching suggestions for a transaction

**Process:**
1. User clicks "Ask AI" on a transaction
2. System sends transaction details to matching service
3. Matching service returns ranked suggestions with confidence scores
4. User reviews and selects best match

**Data Sent:**
- Transaction date, particulars, credit amount
- Transaction code, extracted phone numbers
- All active members

**Response:**
- Ranked list of potential matches
- Confidence scores
- Match reasons

### 2.5 Member Management

#### Member CRUD Operations

**Fields:**
- `name`: Full name (required)
- `phone`: Phone number (254XXXXXXXXX format)
- `email`: Email address (optional)
- `member_code`: Unique member code
- `member_number`: Member number
- `notes`: Additional notes
- `is_active`: Active status flag

**Operations:**
- Create: Add new member
- Read: List all members (paginated, searchable)
- Update: Edit member details
- Delete: Soft delete (if implemented) or hard delete

#### Bulk Member Upload

**CSV Import:**
- Upload CSV file with member data
- Required columns: `name`, `phone`
- Optional columns: `email`, `member_code`, `member_number`
- Validation: Checks for duplicates, required fields
- Error reporting: Returns list of successful imports and errors

**CSV Format:**
```csv
name,phone,email,member_code,member_number
John Doe,254712345678,john@example.com,M001,12345
Jane Smith,254798765432,jane@example.com,M002,12346
```

### 2.6 Manual Contributions

**Purpose**: Record contributions not captured in bank statements

**Use Cases:**
- Cash payments
- Direct deposits
- Offline payments
- Corrections/adjustments

**Fields:**
- `member_id`: Member (required)
- `amount`: Contribution amount (required, min 0.01)
- `contribution_date`: Date of contribution (required)
- `payment_method`: `cash`, `mpesa`, `bank_transfer`, `other`
- `notes`: Additional notes
- `created_by`: User who created the entry

**Features:**
- Filter by member, date range
- Pagination
- Full CRUD operations
- Included in contribution totals and reports

### 2.7 Expense Management

**Purpose**: Track expenses and link to transactions

**Fields:**
- `transaction_id`: Optional link to bank transaction
- `description`: Expense description (required)
- `amount`: Expense amount (required, min 0)
- `expense_date`: Date of expense (required)
- `category`: Expense category (optional)
- `notes`: Additional notes

**Features:**
- Filter by category, date range
- Pagination
- Full CRUD operations
- Link expenses to bank transactions for reconciliation

### 2.8 Dashboard & Reporting

#### Dashboard Statistics

**Key Metrics:**
1. **Total Members**: Count of all active members
2. **Unassigned Transactions**: Count of transactions without member assignment
3. **Draft Assignments**: Count of transactions with multiple potential matches
4. **Auto-Assigned**: Count of automatically matched transactions
5. **Total Contributions**: Sum of all assigned transaction credits + manual contributions
6. **Statements Processed**: Count of successfully processed bank statements

#### Contribution Charts

**Contributions by Week:**
- Last 12 weeks of contributions
- Calculated from assigned transactions + manual contributions
- Week numbering based on configurable start date
- Visual bar chart with amounts

**Contributions by Month:**
- Last 6 months of contributions
- Monthly totals
- Visual bar chart with amounts

#### Recent Activity

**Recent Transactions:**
- Last 10 transactions
- Shows: particulars, date, amount, assignment status
- Color-coded status badges

**Recent Statements:**
- Last 5 processed statements
- Shows: filename, upload date, processing status
- Error messages for failed statements

### 2.9 Audit Trail & Logging

#### Transaction Match Logs

**Purpose**: Track all assignment attempts and changes

**Fields:**
- `transaction_id`: Transaction being matched
- `member_id`: Member matched to
- `confidence`: Match confidence score (0-1)
- `match_reason`: Reason for match (e.g., "Phone number match", "Name match")
- `source`: `auto` or `manual`
- `user_id`: User who made manual assignment (if applicable)
- `created_at`: Timestamp

**Use Cases:**
- Audit trail for compliance
- Debugging matching issues
- Understanding assignment history
- Reporting on assignment accuracy

#### System Logging

**Laravel Logs:**
- OCR parsing errors and warnings
- Matching service communication errors
- Queue job failures
- Database errors

**Python Script Logs:**
- Text extraction statistics
- Transaction detection counts
- OCR fallback triggers
- Error messages

---

## 3. Technical Architecture

### 3.1 System Architecture Overview

```
┌─────────────────┐
│   Frontend      │  React + Vite + Tailwind CSS
│   (Port 5173)   │
└────────┬────────┘
         │ HTTP/REST API
         │
┌────────▼────────┐
│   Backend       │  Laravel 10+ (PHP 8.1+)
│   (Port 8000)   │  MySQL Database
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬──────────────┐
    │         │              │              │
┌───▼───┐ ┌──▼────┐   ┌─────▼─────┐  ┌────▼─────┐
│ Queue │ │ OCR   │   │ Matching  │  │ Storage  │
│Worker │ │Parser │   │ Service   │  │   (PDF)  │
│       │ │(Python)│   │ (Node.js) │  │          │
└───────┘ └───────┘   │(Port 3001) │  └──────────┘
                      └────────────┘
```

### 3.2 Backend Architecture (Laravel)

#### Technology Stack

**Framework**: Laravel 10+
- **PHP Version**: 8.1+
- **Database**: MySQL
- **Authentication**: Laravel Sanctum (token-based)
- **Queue System**: Laravel Queue (database driver)
- **File Storage**: Laravel Storage (local filesystem)

#### Directory Structure

```
backend/
├── app/
│   ├── Console/
│   │   └── Commands/
│   │       ├── CheckOcrSetup.php      # OCR diagnostic command
│   │       └── TestOcrDirect.php      # Direct OCR testing
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthController.php     # Authentication
│   │   │   ├── MemberController.php   # Member CRUD
│   │   │   ├── StatementController.php # Statement upload
│   │   │   ├── TransactionController.php # Transaction management
│   │   │   ├── ExpenseController.php  # Expense management
│   │   │   └── ManualContributionController.php
│   │   └── Middleware/
│   ├── Jobs/
│   │   └── ProcessBankStatement.php  # Queue job for PDF processing
│   ├── Models/
│   │   ├── BankStatement.php
│   │   ├── Transaction.php
│   │   ├── Member.php
│   │   ├── Expense.php
│   │   ├── ManualContribution.php
│   │   ├── TransactionMatchLog.php
│   │   └── TransactionSplit.php
│   └── Services/
│       ├── OcrParserService.php       # Python script interface
│       ├── MatchingService.php       # Matching microservice client
│       └── TransactionParserService.php # Transaction parsing
├── database/
│   └── migrations/                   # Database schema
├── routes/
│   └── api.php                       # API routes
├── storage/
│   └── app/
│       └── statements/               # Uploaded PDFs
└── config/
    └── app.php                       # Configuration
```

#### Key Components

**1. OcrParserService**
- **Purpose**: Interface between Laravel and Python OCR parser
- **Responsibilities**:
  - Locate Python executable (`python3`, `python`, `py`)
  - Execute Python script with PDF path
  - Capture stdout/stderr output
  - Parse JSON response
  - Handle errors gracefully
  - Log all operations

**2. ProcessBankStatement Job**
- **Purpose**: Background processing of uploaded PDFs
- **Workflow**:
  1. Update statement status to `processing`
  2. Call `OcrParserService->parsePdf()`
  3. Normalize extracted transactions
  4. Filter duplicates (using row_hash)
  5. Store transactions in database
  6. Update statement status to `completed` or `failed`

**3. TransactionParserService**
- **Purpose**: Extract structured data from transaction particulars
- **Functions**:
  - `parseParticulars()`: Main parsing function
  - `normalizePhone()`: Standardize phone format
  - `normalizeName()`: Clean names for comparison
  - `compareNames()`: Fuzzy string matching
  - `extractPhones()`: Extract phone numbers from text
  - `extractMemberName()`: Extract names from Paybill details

**4. MatchingService**
- **Purpose**: HTTP client for matching microservice
- **Methods**:
  - `matchBatch()`: Send transactions and members to matching service
  - Error handling and timeout management
  - Fallback if service unavailable

#### Database Schema

**bank_statements**
- `id`, `filename`, `file_path`, `file_hash`
- `statement_date`, `account_number`
- `status` (uploaded, processing, completed, failed)
- `error_message`, `raw_metadata`
- `created_at`, `updated_at`

**transactions**
- `id`, `bank_statement_id` (FK)
- `tran_date`, `value_date`, `particulars`
- `transaction_type`, `credit`, `debit`, `balance`
- `transaction_code`, `phones` (JSON)
- `row_hash` (for duplicate detection)
- `member_id` (FK, nullable)
- `assignment_status` (unassigned, auto_assigned, manual_assigned, draft, flagged)
- `match_confidence`, `draft_member_ids` (JSON)
- `raw_text`, `raw_json` (JSON)
- `created_at`, `updated_at`

**members**
- `id`, `name`, `phone`, `email`
- `member_code`, `member_number`
- `notes`, `is_active`
- `created_at`, `updated_at`

**transaction_match_logs**
- `id`, `transaction_id` (FK), `member_id` (FK)
- `confidence`, `match_reason`
- `source` (auto, manual)
- `user_id` (FK, nullable)
- `created_at`

**transaction_splits**
- `id`, `transaction_id` (FK), `member_id` (FK)
- `amount`, `notes`
- `created_at`, `updated_at`

**expenses**
- `id`, `transaction_id` (FK, nullable)
- `description`, `amount`, `expense_date`
- `category`, `notes`
- `created_at`, `updated_at`

**manual_contributions**
- `id`, `member_id` (FK)
- `amount`, `contribution_date`
- `payment_method`, `notes`
- `created_by` (FK)
- `created_at`, `updated_at`

#### API Endpoints

**Authentication:**
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

**Members:**
- `GET /api/members` - List members (paginated, searchable)
- `POST /api/members` - Create member
- `GET /api/members/{id}` - Get member
- `PUT /api/members/{id}` - Update member
- `DELETE /api/members/{id}` - Delete member
- `POST /api/members/bulk-upload` - Bulk CSV upload

**Bank Statements:**
- `GET /api/statements` - List statements
- `GET /api/statements/{id}` - Get statement
- `POST /api/statements/upload` - Upload PDF
- `DELETE /api/statements/{id}` - Delete statement

**Transactions:**
- `GET /api/transactions` - List transactions (filterable, searchable, paginated)
- `GET /api/transactions/{id}` - Get transaction with relations
- `POST /api/transactions/{id}/assign` - Assign transaction to member
- `POST /api/transactions/{id}/split` - Split transaction
- `POST /api/transactions/auto-assign` - Run auto-assignment
- `POST /api/transactions/bulk-assign` - Bulk assignment
- `POST /api/transactions/ask-ai` - Get AI suggestions

**Expenses:**
- `GET /api/expenses` - List expenses (filterable, paginated)
- `POST /api/expenses` - Create expense
- `GET /api/expenses/{id}` - Get expense
- `PUT /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense

**Manual Contributions:**
- `GET /api/manual-contributions` - List contributions (filterable, paginated)
- `POST /api/manual-contributions` - Create contribution
- `GET /api/manual-contributions/{id}` - Get contribution
- `PUT /api/manual-contributions/{id}` - Update contribution
- `DELETE /api/manual-contributions/{id}` - Delete contribution

### 3.3 Frontend Architecture (React)

#### Technology Stack

**Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Routing**: React Router

#### Directory Structure

```
frontend/
├── src/
│   ├── api/                         # API client functions
│   │   ├── auth.js
│   │   ├── members.js
│   │   ├── statements.js
│   │   ├── transactions.js
│   │   ├── expenses.js
│   │   └── manualContributions.js
│   ├── components/                  # Reusable components
│   ├── pages/                       # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Members.jsx
│   │   ├── Statements.jsx
│   │   ├── Transactions.jsx
│   │   ├── Expenses.jsx
│   │   └── ManualContributions.jsx
│   ├── App.jsx                      # Main app component
│   └── main.jsx                     # Entry point
├── package.json
└── vite.config.js
```

#### Key Features

**React Query Integration:**
- Automatic caching and refetching
- Optimistic updates
- Loading and error states
- Pagination support

**Component Architecture:**
- Functional components with hooks
- Separation of concerns (API, UI, logic)
- Reusable UI components
- Responsive design (mobile-friendly)

**State Management:**
- React Query for server state
- Local state for UI interactions
- Context API for authentication

### 3.4 OCR Parser (Python Service)

#### Technology Stack

**Language**: Python 3.9+
- **Libraries**:
  - `pdfplumber`: PDF text and table extraction
  - `pytesseract`: Python wrapper for Tesseract OCR
  - `pdf2image`: Convert PDF pages to images for OCR

**External Dependencies:**
- Tesseract OCR engine (system installation required)

#### Architecture

**Main Script**: `ocr-parser/parse_pdf.py`

**Key Functions:**

1. **`extract_text_from_pdf_pdfplumber(pdf_path)`**
   - Primary extraction method
   - Two-pass approach for Paybill documents
   - Text extraction for regular statements
   - Returns: `{'text': str, 'tables': list}`

2. **`extract_text_from_pdf_ocr(pdf_path)`**
   - Fallback method for scanned PDFs
   - Converts PDF pages to images
   - Runs Tesseract OCR on each image
   - Combines OCR text from all pages

3. **`detect_table_rows(text)`**
   - Pattern matching to identify transaction rows
   - Regex patterns for dates, amounts, descriptions
   - Filters invalid rows
   - Returns list of transaction dictionaries

4. **`parse_date(date_str)`**
   - Flexible date parsing
   - Supports multiple formats (DD/MM/YYYY, DD-MM-YYYY, etc.)
   - Returns ISO format date string

**Command-Line Interface:**
```bash
python parse_pdf.py <pdf_path> --output <json_path>
```

**Output Format:**
- JSON array of transaction objects
- Each transaction: `tran_date`, `value_date`, `particulars`, `credit`, `debit`, `balance`, `transaction_code`
- Debug text file: `{output_path}_debug.txt` (for troubleshooting)

**Error Handling:**
- Graceful fallback from pdfplumber to OCR
- Detailed error messages to stderr
- Valid JSON output even if no transactions found

### 3.5 Matching Service (Node.js Microservice)

#### Technology Stack

**Runtime**: Node.js 18+
- **Framework**: Express.js
- **Libraries**:
  - `string-similarity`: Fuzzy string matching
  - `cors`: Cross-origin resource sharing
  - `dotenv`: Environment configuration

#### Architecture

**Main Files:**
- `server.js`: Express server setup
- `matcher.js`: Matching logic

**Key Functions:**

1. **`matchTransaction(transaction, members)`**
   - Matches single transaction to members
   - Returns ranked list of matches with confidence scores

2. **`matchBatch(transactions, members)`**
   - Batch matching for multiple transactions
   - Returns matches for all transactions

3. **`extractPhones(text)`**
   - Extracts phone numbers from text
   - Normalizes to standard format

**Endpoints:**
- `POST /match-batch`: Batch matching
- `GET /health`: Health check

**Integration:**
- Called via HTTP from Laravel backend
- Timeout: 60 seconds
- Error handling: Returns empty array on failure

### 3.6 Queue System

#### Laravel Queue (Database Driver)

**Purpose**: Background processing of PDF uploads

**Why Database Driver:**
- cPanel compatibility (no Redis requirement)
- Simple setup and maintenance
- Reliable job persistence

**Queue Table**: `jobs`
- Stores pending jobs
- Tracks job attempts and failures

**Queue Worker:**
```bash
php artisan queue:work
```

**Job Processing:**
1. Job queued when PDF uploaded
2. Queue worker picks up job
3. `ProcessBankStatement` job executed
4. Status updates throughout process
5. Job removed from queue on completion

**Error Handling:**
- Failed jobs logged to `failed_jobs` table
- Error messages stored in `bank_statements.error_message`
- Retry mechanism (configurable)

### 3.7 File Storage

#### Laravel Storage

**Storage Driver**: Local filesystem

**Storage Path**: `storage/app/statements/`

**File Naming:**
- Unique filename generated on upload
- Original filename stored in database
- File hash for duplicate detection

**Security:**
- Files stored outside public directory
- Access controlled via Laravel routes
- File validation (type, size)

---

## 4. Data Flow & Workflows

### 4.1 PDF Upload & Processing Flow

```
User Uploads PDF
    ↓
StatementController->upload()
    ↓
Validate File (type, size)
    ↓
Store File (storage/app/statements/)
    ↓
Create BankStatement Record (status: uploaded)
    ↓
Queue ProcessBankStatement Job
    ↓
[Queue Worker Picks Up Job]
    ↓
Update Status (processing)
    ↓
OcrParserService->parsePdf()
    ↓
Execute Python Script (parse_pdf.py)
    ↓
Python Extracts Transactions
    ↓
Return JSON Array
    ↓
Normalize Transactions
    ↓
Filter Duplicates (row_hash)
    ↓
Store Transactions in Database
    ↓
Update Status (completed/failed)
```

### 4.2 Auto-Assignment Flow

```
User Clicks "Auto Assign"
    ↓
TransactionController->autoAssign()
    ↓
Delete All Debit Transactions
    ↓
Get Unassigned/Draft Transactions
    ↓
Get All Active Members
    ↓
For Each Transaction:
    ↓
    Parse Transaction Particulars
    ↓
    Extract: phones, names, member_number, transaction_type
    ↓
    Strategy 1: Phone Match
    │   → Exact/Last 9 digits match?
    │   → Auto-assign if single match
    │   → Draft if multiple matches
    ↓
    Strategy 1.5: Paybill Name + Phone Last 3
    │   → Name match (≥0.6) + Last 3 digits match?
    │   → Auto-assign if single match (100% confidence)
    │   → Draft if multiple/no phone match
    ↓
    Strategy 2: Name Match
    │   → Fuzzy name match (≥0.6)?
    │   → Check phone conflict
    │   → Auto-assign if single + high confidence + no conflict
    │   → Draft if multiple/conflict
    ↓
    Strategy 3: Member Number Match
    │   → Exact member_number/code match?
    │   → Auto-assign (98% confidence)
    ↓
Create TransactionMatchLog Entries
    ↓
Return Results (auto_assigned, draft_assigned counts)
```

### 4.3 Manual Assignment Flow

```
User Views Transaction
    ↓
User Selects Member
    ↓
TransactionController->assign()
    ↓
Validate Request (member_id required)
    ↓
Update Transaction:
    - member_id
    - assignment_status: manual_assigned
    - match_confidence: 1.0
    ↓
Create TransactionMatchLog:
    - transaction_id
    - member_id
    - confidence: 1.0
    - match_reason: "Manual assignment"
    - source: manual
    - user_id
    ↓
Return Updated Transaction
```

### 4.4 Transaction Splitting Flow

```
User Views Transaction
    ↓
User Clicks "Split Transaction"
    ↓
User Enters Splits:
    - Member 1: Amount 1
    - Member 2: Amount 2
    - ...
    ↓
TransactionController->split()
    ↓
Validate:
    - At least one split
    - Sum equals transaction amount
    ↓
Delete Existing Splits
    ↓
Create TransactionSplit Records
    ↓
Update Transaction Status (manual_assigned)
    ↓
Return Transaction with Splits
```

---

## 5. Security & Data Protection

### 5.1 Authentication & Authorization

**Laravel Sanctum:**
- Token-based authentication
- Secure token storage
- Token expiration
- CSRF protection

**API Protection:**
- All routes (except login/register) require authentication
- Middleware: `auth:sanctum`
- User context available in controllers

### 5.2 Data Validation

**Input Validation:**
- Laravel form request validation
- File type validation (PDF only)
- File size limits
- SQL injection prevention (Eloquent ORM)
- XSS prevention (output escaping)

**Business Logic Validation:**
- Duplicate transaction detection
- Amount validation (positive numbers)
- Date validation (valid dates)
- Member existence checks

### 5.3 File Security

**Storage:**
- Files stored outside public directory
- Access controlled via Laravel
- Unique filenames prevent conflicts
- File hash for integrity checking

**Upload Security:**
- File type validation
- Size limits
- Virus scanning (if configured)

### 5.4 Database Security

**Prepared Statements:**
- Eloquent ORM uses prepared statements
- SQL injection prevention

**Access Control:**
- Database user with minimal privileges
- No direct database access from frontend

---

## 6. Performance & Scalability

### 6.1 Optimization Strategies

**Queue Processing:**
- Background job processing prevents timeouts
- Async PDF processing
- Non-blocking user experience

**Database Indexing:**
- Indexed columns: `transaction_code`, `tran_date`, `row_hash`, `member_id`
- Fast lookups for matching and filtering

**Caching:**
- React Query caching reduces API calls
- Member list caching
- Transaction list pagination

**Batch Operations:**
- Batch matching for multiple transactions
- Bulk assignment API
- Efficient database queries (eager loading)

### 6.2 Scalability Considerations

**Horizontal Scaling:**
- Stateless API (can run multiple instances)
- Database can be scaled separately
- Queue workers can be scaled independently

**Vertical Scaling:**
- Increase PHP memory limits for large PDFs
- Increase queue worker timeout
- Optimize database queries

**File Storage:**
- Can migrate to cloud storage (S3, etc.)
- CDN for static assets (if needed)

---

## 7. Error Handling & Logging

### 7.1 Error Handling

**Python Script Errors:**
- Captured in stderr
- Logged to Laravel logs
- User-friendly error messages
- Fallback to OCR if pdfplumber fails

**Queue Job Failures:**
- Stored in `failed_jobs` table
- Error messages in `bank_statements.error_message`
- Retry mechanism available

**API Errors:**
- HTTP status codes (400, 401, 404, 422, 500)
- JSON error responses
- Validation error details

### 7.2 Logging

**Laravel Logs:**
- `storage/logs/laravel.log`
- Logs: errors, warnings, info, debug
- Structured logging with context

**Python Script Logs:**
- Output to stderr (captured by Laravel)
- Debug text files for troubleshooting
- Transaction extraction statistics

**Audit Trail:**
- `TransactionMatchLog` table
- All assignments tracked
- User actions logged

---

## 8. Deployment

### 8.1 cPanel Deployment

**Directory Structure:**
```
home2/royalce1/
├── laravel-ap/
│   └── member-contributions/     # Application root
│       ├── backend/              # Laravel app
│       ├── frontend/             # React app (source)
│       ├── ocr-parser/           # Python scripts
│       └── matching-service/     # Node.js service
└── public_html/
    └── statement/                # Public files
        ├── index.php             # Laravel entry point
        ├── .htaccess             # Apache config
        └── assets/               # Built frontend assets
```

**Configuration:**
- `.env` file with production settings
- Database connection configured
- Queue worker running as background process
- Python and Node.js services accessible

### 8.2 Environment Configuration

**Required Environment Variables:**
- `APP_ENV=production`
- `APP_DEBUG=false`
- `DB_*`: Database credentials
- `QUEUE_CONNECTION=database`
- `TESSERACT_PATH`: Path to Tesseract executable
- `PYTHON_PATH`: Python executable path (optional)
- `MATCHING_SERVICE_URL`: Matching service URL

---

## 9. Testing

### 9.1 Backend Testing

**PHPUnit Tests:**
- Unit tests for services
- Integration tests for controllers
- Database tests with transactions

**Test Coverage:**
- Transaction parsing logic
- Matching algorithms
- API endpoints
- Error handling

### 9.2 Frontend Testing

**Jest + React Testing Library:**
- Component tests
- Integration tests
- User interaction tests

### 9.3 E2E Testing

**Smoke Tests:**
- Full workflow testing
- PDF upload → processing → assignment
- API endpoint verification

---

## 10. Future Enhancements

### Potential Features

1. **Advanced Reporting:**
   - Member contribution history
   - Monthly/yearly summaries
   - Export to Excel/PDF

2. **Notifications:**
   - Email notifications for processing completion
   - Alerts for unmatched transactions

3. **Multi-User Support:**
   - Role-based access control
   - User activity tracking

4. **API Improvements:**
   - GraphQL API option
   - Webhook support
   - Rate limiting

5. **OCR Improvements:**
   - Machine learning for better extraction
   - Support for more bank formats
   - Improved OCR accuracy

6. **Matching Improvements:**
   - Machine learning models
   - Historical pattern learning
   - Confidence score refinement

---

## Conclusion

The Member Contribution Bank Reconciliation System is a comprehensive solution that automates the tedious process of reconciling bank statements with member contributions. Through intelligent OCR extraction, multi-strategy matching algorithms, and a user-friendly interface, it achieves high accuracy while significantly reducing manual effort. The modular architecture ensures maintainability and scalability, making it suitable for organizations of various sizes.

The system's strength lies in its ability to handle both structured (M-Pesa Paybill) and unstructured (regular bank statements) PDF formats, with automatic fallback to OCR when needed. The multi-strategy matching approach ensures high auto-assignment rates while maintaining accuracy through confidence scoring and draft assignments for ambiguous cases.

With comprehensive error handling, logging, and audit trails, the system provides transparency and reliability, making it a robust solution for financial reconciliation tasks.

