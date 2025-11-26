# Local Development - Starting Services

This guide explains how to start all services for local development.

## Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PHP** (v8.1 or higher) - [Download](https://www.php.net/downloads.php)
- **Composer** - [Download](https://getcomposer.org/)
- **MySQL/MariaDB** - For database

## Quick Start

### Windows

**Option 1: PowerShell (Recommended)**
```powershell
.\start-services.ps1
```

**Option 2: Batch File (Easier)**
```cmd
start-services.bat
```

**Option 3: Manual (Full Control)**
Open 4 separate terminal windows and run:

```bash
# Terminal 1: Matching Service
cd matching-service
npm install  # First time only
npm start

# Terminal 2: Laravel Queue Worker
cd backend
php artisan queue:work

# Terminal 3: Laravel Backend API
cd backend
php artisan serve

# Terminal 4: Frontend Development Server
cd frontend
npm install  # First time only
npm run dev
```

### Mac/Linux (or Git Bash on Windows)

```bash
chmod +x start-services.sh
./start-services.sh
```

## Service URLs

Once started, services will be available at:

- **Frontend**: http://localhost:5173
- **Laravel API**: http://localhost:8000
- **Matching Service**: http://localhost:3001/health

## Stopping Services

### Windows PowerShell
```powershell
.\stop-services.ps1
```

### Windows Batch
```cmd
stop-services.bat
```

### Mac/Linux/Git Bash
```bash
./stop-services.sh
```

### Manual Stop
- Close the terminal windows, or
- Press `Ctrl+C` in each terminal window

## First Time Setup

1. **Backend Setup:**
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   # Edit .env with your database credentials
   php artisan migrate
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   ```

3. **Matching Service Setup:**
   ```bash
   cd matching-service
   npm install
   ```

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
- Check Task Manager (Windows) or Activity Monitor (Mac) for running processes
- Kill the process using that port
- Or change the port in the service configuration

### Services Not Starting
- Check that Node.js and PHP are in your PATH
- Verify `.env` file exists in `backend/` directory
- Check logs in the `logs/` directory (if using scripts)

### Database Connection Issues
- Verify database credentials in `backend/.env`
- Ensure MySQL/MariaDB is running
- Run `php artisan migrate` to create tables

## Logs

If using the start scripts, logs are saved in the `logs/` directory:
- `logs/matching-service.log`
- `logs/queue-worker.log`
- `logs/laravel-backend.log`
- `logs/frontend.log`

## Notes

- The auto-start scripts are **excluded from git** - they're for local use only
- On production server, services are managed via PM2 (queue worker and matching service)
- Frontend and backend are served by the web server on production

