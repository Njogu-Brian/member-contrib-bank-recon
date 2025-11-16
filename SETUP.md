# Setup Guide

## Quick Start

### 1. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE member_contributions;
```

### 2. Backend Setup

```bash
cd backend
composer install
cp .env.example .env
# Edit .env with your database credentials
php artisan key:generate
php artisan migrate
```

Create storage directories:
```bash
mkdir -p storage/app/statements
chmod -R 775 storage
```

### 3. Python OCR Setup

```bash
cd ocr-parser
pip install -r requirements.txt
```

Install Tesseract:
- Windows: https://github.com/UB-Mannheim/tesseract/wiki
- macOS: `brew install tesseract`
- Linux: `sudo apt-get install tesseract-ocr`

### 4. Node.js Matching Service

```bash
cd matching-service
npm install
```

### 5. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Terminal 1: Laravel Backend
```bash
cd backend
php artisan serve
```

### Terminal 2: Queue Worker
```bash
cd backend
php artisan queue:work
```

### Terminal 3: Matching Service
```bash
cd matching-service
npm start
```

### Terminal 4: Frontend
```bash
cd frontend
npm run dev
```

## Access

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Matching Service: http://localhost:3001

## First Steps

1. Register a new account at http://localhost:5173
2. Add members via Members page or bulk upload CSV
3. Upload a bank statement PDF
4. Wait for processing (check queue worker terminal)
5. Run auto-assignment on Transactions page
6. Review and manually assign unmatched transactions

## Troubleshooting

### Queue Jobs Not Processing
- Ensure queue worker is running: `php artisan queue:work`
- Check database connection in `.env`
- Check `jobs` table exists: `php artisan migrate`

### OCR Not Working
- Verify Python is installed: `python3 --version`
- Verify Tesseract is installed: `tesseract --version`
- Check Python path in `.env`: `PYTHON_PATH=python3`

### Matching Service Not Responding
- Check if service is running on port 3001
- Verify `MATCHING_SERVICE_URL` in backend `.env`

### Frontend Not Connecting to Backend
- Check proxy configuration in `frontend/vite.config.js`
- Verify backend is running on port 8000
- Check CORS settings in Laravel

