# Member Contribution Bank Reconciliation System

A comprehensive full-stack application for automating bank statement reconciliation with member contributions.

## System Overview

This system automates the process of:
- Extracting transactions from PDF bank statements (M-Pesa Paybill and regular statements)
- Automatically matching transactions to members using intelligent algorithms
- Providing a user-friendly interface for review and manual assignment
- Tracking contributions, expenses, and manual entries

## Architecture

- **Backend**: Laravel 10+ (PHP 8.1+)
- **Frontend**: React 18+ with Vite and Tailwind CSS
- **OCR Parser**: Python 3.9+ service
- **Matching Service**: Node.js 18+ microservice
- **Database**: MySQL

## Prerequisites

- PHP 8.1+
- Node.js 18+
- Python 3.9+
- MySQL 5.7+
- Composer
- Tesseract OCR (for OCR functionality)

## Installation

### 1. Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure `.env` with your database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=member_contributions
DB_USERNAME=root
DB_PASSWORD=your_password

PYTHON_PATH=python3
TESSERACT_PATH=tesseract
MATCHING_SERVICE_URL=http://localhost:3001
```

Run migrations:
```bash
php artisan migrate
```

Start the queue worker (in a separate terminal):
```bash
php artisan queue:work
```

Start the Laravel server:
```bash
php artisan serve
```

### 2. Python OCR Parser Setup

```bash
cd ocr-parser
pip install -r requirements.txt
```

Install Tesseract OCR:
- **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki
- **macOS**: `brew install tesseract`
- **Linux**: `sudo apt-get install tesseract-ocr`

### 3. Node.js Matching Service Setup

```bash
cd matching-service
npm install
npm start
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Access the application at `http://localhost:5173`
2. Register/Login to create an account
3. Add members via the Members page or bulk upload CSV
4. Upload bank statement PDFs via the Statements page
5. Run auto-assignment to match transactions to members
6. Review and manually assign unmatched transactions
7. View dashboard for statistics and reports

## Features

- **PDF Upload & Processing**: Upload M-Pesa Paybill or regular bank statement PDFs
- **Intelligent Matching**: Multi-strategy auto-assignment algorithm
- **Manual Assignment**: Review and manually assign transactions
- **Transaction Splitting**: Split transactions across multiple members
- **Member Management**: CRUD operations and bulk CSV upload
- **Expense Tracking**: Track and categorize expenses
- **Manual Contributions**: Record contributions not in bank statements
- **Dashboard**: Statistics, charts, and recent activity

## API Endpoints

See `SYSTEM_DESCRIPTION.md` for complete API documentation.

## Development

### Running Locally

1. Start MySQL database
2. Start Laravel backend: `cd backend && php artisan serve`
3. Start queue worker: `cd backend && php artisan queue:work`
4. Start matching service: `cd matching-service && npm start`
5. Start frontend: `cd frontend && npm run dev`

### Testing

Backend tests:
```bash
cd backend
php artisan test
```

## License

MIT

