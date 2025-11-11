# Deployment Guide

## Local Development Setup (XAMPP)

### Prerequisites
- XAMPP installed with MySQL running
- PHP 8.1+ (included in XAMPP)
- Composer installed
- Node.js 18+
- Python 3.9+
- Tesseract OCR installed

### Step 1: Database Setup

1. Start XAMPP and ensure MySQL is running
2. Open phpMyAdmin (http://localhost/phpmyadmin)
3. Create a new database: `member_contrib`
4. Note your MySQL credentials (usually `root` with no password)

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
composer install

# Copy environment file
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac

# Edit .env file with your database credentials:
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=member_contrib
# DB_USERNAME=root
# DB_PASSWORD=

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# (Optional) Seed test data
php artisan db:seed
```

### Step 3: OCR Parser Setup

```bash
cd ocr-parser

# Install Python dependencies
pip install -r requirements.txt

# Install Tesseract:
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
# macOS: brew install tesseract
# Linux: sudo apt-get install tesseract-ocr

# Test OCR parser
python parse_pdf.py fixtures/sample_statement.pdf --output test.json
```

### Step 4: Matching Service Setup

```bash
cd matching-service

# Install dependencies
npm install

# Start service
npm start
# Service runs on http://localhost:3001
```

### Step 5: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend runs on http://localhost:3000
```

### Step 6: Run Queue Worker

In a separate terminal:

```bash
cd backend
php artisan queue:work
```

### Step 7: Start Backend Server

```bash
cd backend
php artisan serve
# Backend runs on http://localhost:8000
```

## cPanel Deployment

### Prerequisites
- cPanel hosting account
- SSH access (recommended)
- PHP 8.1+ enabled
- MySQL database created
- Node.js 18+ (if available, or use build locally)

### Step 1: Database Export/Import

**Local Export:**
```bash
cd backend
php artisan db:export > database_export.sql
# Or use phpMyAdmin to export
```

**cPanel Import:**
1. Log into cPanel
2. Go to phpMyAdmin
3. Select your database
4. Click "Import"
5. Upload `database_export.sql`

### Step 2: Upload Backend Files

1. **Via File Manager:**
   - Upload all `backend/` files to `public_html/api/` (or your preferred directory)
   - Ensure `.env` is uploaded and configured

2. **Via SSH (Recommended):**
```bash
# On your local machine
cd backend
tar -czf backend.tar.gz .
scp backend.tar.gz user@yourdomain.com:~/backend.tar.gz

# SSH into server
ssh user@yourdomain.com
cd public_html/api  # or your directory
tar -xzf ~/backend.tar.gz
```

### Step 3: Configure Backend

1. **Edit `.env` file on server:**
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_HOST=localhost
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password

QUEUE_CONNECTION=database

TESSERACT_PATH=/usr/bin/tesseract  # Adjust path
MATCHING_SERVICE_URL=http://localhost:3001
```

2. **Set permissions:**
```bash
chmod -R 755 storage bootstrap/cache
chown -R user:user storage bootstrap/cache
```

3. **Install dependencies:**
```bash
composer install --no-dev --optimize-autoloader
```

4. **Run migrations:**
```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

### Step 4: Setup Queue Worker (Cron Job)

In cPanel, add a cron job:

```bash
* * * * * cd /home/username/public_html/api && php artisan schedule:run >> /dev/null 2>&1
```

Or for queue worker (if using supervisor is not available):

```bash
*/5 * * * * cd /home/username/public_html/api && php artisan queue:work --stop-when-empty >> /dev/null 2>&1
```

### Step 5: Build and Upload Frontend

**Option A: Build Locally and Upload**

```bash
cd frontend
npm run build
# Upload dist/ folder contents to public_html/ or subdomain
```

**Option B: Build on Server (if Node.js available)**

```bash
cd frontend
npm install
npm run build
# Copy dist/ to public directory
```

### Step 6: Configure Web Server

**Apache (.htaccess in backend/public):**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [L]
</IfModule>
```

**Point domain/subdomain to:**
- Backend: `public_html/api/public/`
- Frontend: `public_html/` or subdomain

### Step 7: Setup OCR Parser on Server

1. Install Python dependencies:
```bash
cd ocr-parser
pip3 install -r requirements.txt --user
```

2. Install Tesseract (via SSH or ask hosting provider):
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Or use system package manager
```

3. Update `.env` with correct Tesseract path

### Step 8: Setup Matching Service

**Option A: Run as background service (PM2 recommended)**
```bash
cd matching-service
npm install --production
pm2 start server.js --name matching-service
pm2 save
```

**Option B: Run via cron (less ideal)**
```bash
# Keep service running via screen/tmux
screen -S matching-service
cd matching-service
npm start
# Press Ctrl+A then D to detach
```

### Step 9: SSL and Security

1. Enable SSL certificate in cPanel
2. Update `APP_URL` in `.env` to use `https://`
3. Ensure `.env` file is not publicly accessible
4. Set proper file permissions

### Step 10: Testing

1. Visit your frontend URL
2. Test login/registration
3. Upload a test PDF
4. Check queue processing
5. Verify transactions appear

## Troubleshooting

### Queue Not Processing
- Check cron job is running
- Verify `QUEUE_CONNECTION=database` in `.env`
- Check `jobs` table exists
- Run `php artisan queue:work` manually to test

### OCR Parser Fails
- Verify Tesseract is installed: `tesseract --version`
- Check `TESSERACT_PATH` in `.env`
- Test OCR parser manually: `python parse_pdf.py test.pdf`

### Matching Service Not Responding
- Check service is running: `curl http://localhost:3001/health`
- Verify `MATCHING_SERVICE_URL` in backend `.env`
- Check firewall allows port 3001

### Permission Errors
```bash
chmod -R 755 storage bootstrap/cache
chown -R user:user storage bootstrap/cache
```

### Database Connection Issues
- Verify database credentials in `.env`
- Check MySQL user has proper permissions
- Ensure database exists

## Production Checklist

- [ ] `APP_DEBUG=false` in `.env`
- [ ] `APP_ENV=production` in `.env`
- [ ] SSL certificate installed
- [ ] Database backups configured
- [ ] Queue worker running (cron or supervisor)
- [ ] File permissions set correctly
- [ ] `.env` file secured (not publicly accessible)
- [ ] Frontend built and optimized
- [ ] API rate limiting configured
- [ ] Error logging enabled

