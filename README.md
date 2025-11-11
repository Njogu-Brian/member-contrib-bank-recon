# Member Contribution Bank Reconciliation System

A complete full-stack application for ingesting bank statement PDFs, parsing transactions, matching credits to members using AI, and providing a review interface for manual assignment.

## Project Structure

```
member-contrib-bank-recon/
├── backend/              # Laravel 10+ API
├── frontend/             # React + Vite + Tailwind
├── ocr-parser/           # Python OCR service (Tesseract)
├── matching-service/      # Node.js matching microservice
├── fixtures/             # Sample PDFs and CSVs
└── README.md
```

## Tech Stack

- **Backend**: Laravel 10+ (PHP 8.1+), MySQL, Laravel Sanctum
- **Frontend**: React 18+, Vite, Tailwind CSS, Axios, React Query
- **OCR**: Python + Tesseract (pytesseract)
- **Matching**: Node.js/Express with fuzzy matching + optional Cursor AI
- **Queue**: Laravel Queue (database driver for cPanel compatibility)
- **Testing**: PHPUnit, Jest + React Testing Library

## Quick Start

### Prerequisites

- PHP 8.1+ with Composer
- Node.js 18+ with npm
- Python 3.9+ with pip
- MySQL (XAMPP or standalone)
- Tesseract OCR installed
- Redis (optional, for queues)

### Local Development Setup

#### 1. Clone and Setup Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed  # Optional: seed test data
php artisan serve
```

#### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

#### 3. Setup OCR Parser

```bash
cd ocr-parser
pip install -r requirements.txt
# Install Tesseract: https://github.com/tesseract-ocr/tesseract/wiki
python parse_pdf.py fixtures/sample_statement.pdf --output output.json
```

#### 4. Setup Matching Service

```bash
cd matching-service
npm install
npm start
```

#### 5. Run Queue Worker

```bash
cd backend
php artisan queue:work
```

### Environment Variables

See `backend/.env.example` for required configuration:
- `DB_*` - MySQL connection
- `QUEUE_CONNECTION=database` (or `redis`)
- `TESSERACT_PATH` - Path to Tesseract executable
- `MATCHING_SERVICE_URL` - URL to matching microservice
- `CURSOR_API_KEY` - Optional, for AI matching

## Development Workflow

### Branching Model

- `main` - Production-ready code
- `dev` - Integration branch
- `feature/*` - Feature branches

### Commands

```bash
# Backend tests
cd backend && php artisan test

# Frontend tests
cd frontend && npm test

# Frontend build
cd frontend && npm run build

# E2E smoke test
node scripts/e2e-smoke-test.js
```

## API Endpoints

### Authentication
- `POST /api/login` - Login
- `POST /api/register` - Register
- `POST /api/logout` - Logout

### Members
- `GET /api/members` - List members
- `POST /api/members` - Create member
- `POST /api/members/bulk-upload` - Bulk upload CSV

### Bank Statements
- `POST /api/statements/upload` - Upload PDF

### Transactions
- `GET /api/transactions` - List transactions (paginated)
- `POST /api/transactions/{id}/assign` - Assign to member
- `POST /api/transactions/ask-ai` - Get AI suggestions

### Expenses
- `GET /api/expenses` - List expenses

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions:
- Local XAMPP setup
- cPanel deployment guide

## Testing

- Backend: `php artisan test`
- Frontend: `npm test` (in frontend/)
- E2E: `node scripts/e2e-smoke-test.js`

## Developer Checklist

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd member-contrib-bank-recon
   ```

2. **Backend Setup**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   # Edit .env with your database credentials
   php artisan migrate
   php artisan serve  # Runs on http://localhost:8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev  # Runs on http://localhost:3000
   ```

4. **OCR Parser Setup**
   ```bash
   cd ocr-parser
   pip install -r requirements.txt
   # Install Tesseract OCR (see ocr-parser/README.md)
   ```

5. **Matching Service Setup**
   ```bash
   cd matching-service
   npm install
   npm start  # Runs on http://localhost:3001
   ```

6. **Queue Worker**
   ```bash
   cd backend
   php artisan queue:work
   ```

### Daily Development

1. **Start Services** (in separate terminals):
   - Backend: `cd backend && php artisan serve`
   - Frontend: `cd frontend && npm run dev`
   - Matching Service: `cd matching-service && npm start`
   - Queue Worker: `cd backend && php artisan queue:work`

2. **Run Tests**:
   ```bash
   # Backend
   cd backend && php artisan test
   
   # Frontend
   cd frontend && npm test
   ```

3. **Check Code Quality**:
   ```bash
   # Backend (if Laravel Pint is installed)
   cd backend && ./vendor/bin/pint
   ```

### Before Committing

- [ ] All tests pass (`php artisan test` and `npm test`)
- [ ] Code follows project style guidelines
- [ ] No console errors or warnings
- [ ] Environment variables documented in `.env.example`
- [ ] Migration files are up to date
- [ ] No sensitive data in commits

### Before Pushing to `dev`

- [ ] All tests pass
- [ ] E2E smoke test passes: `node scripts/e2e-smoke-test.js`
- [ ] Frontend builds successfully: `cd frontend && npm run build`
- [ ] No linting errors
- [ ] PR description includes:
  - What changed
  - Why it changed
  - How to test

### Before Merging to `main`

- [ ] All CI checks pass
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Deployment steps verified (if applicable)
- [ ] Release notes prepared

### Common Issues & Solutions

**Queue not processing:**
- Check `QUEUE_CONNECTION=database` in `.env`
- Ensure `jobs` table exists: `php artisan migrate`
- Restart queue worker: `php artisan queue:work`

**OCR parser fails:**
- Verify Tesseract installed: `tesseract --version`
- Check `TESSERACT_PATH` in `.env`
- Test manually: `python ocr-parser/parse_pdf.py test.pdf`

**Matching service not responding:**
- Check service running: `curl http://localhost:3001/health`
- Verify `MATCHING_SERVICE_URL` in backend `.env`

**Database connection errors:**
- Verify MySQL is running (XAMPP)
- Check credentials in `.env`
- Ensure database exists: `CREATE DATABASE member_contrib;`

## License

MIT License - see [LICENSE](LICENSE) file

