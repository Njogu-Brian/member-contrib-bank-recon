# Deployment Guide for cPanel

This guide will help you deploy the Member Contributions Bank Reconciliation application to cPanel.

## Prerequisites

- cPanel access with SSH/Terminal enabled
- Git installed on the server
- PHP 8.1+ with required extensions
- MySQL database access
- Composer installed on the server
- Node.js and npm (for frontend build)

## Directory Structure

```
home2/royalce1/
├── laravel-ap/
│   └── member-contributions/     # Laravel application (all except public/)
│       ├── backend/
│       ├── frontend/
│       ├── ocr-parser/
│       ├── matching-service/
│       └── ...
└── public_html/ (or domain folder)
    └── statement/                 # Public files (backend/public contents)
        ├── index.php
        ├── .htaccess
        └── assets/
```

## Step 1: Initial Server Setup

### 1.1 Create Directory Structure

```bash
# SSH into your cPanel server
ssh your-username@your-server.com

# Navigate to your home directory
cd ~/laravel-ap

# Create the application directory
mkdir -p member-contributions

# Navigate into it
cd member-contributions
```

### 1.2 Clone Repository

```bash
# Clone your repository (if not already done)
git clone https://github.com/Njogu-Brian/member-contributions-bank-recon.git .

# Or if you want to use a specific branch
git clone -b master https://github.com/Njogu-Brian/member-contributions-bank-recon.git .
```

### 1.3 Set Up Git Remote for Deployment

```bash
# Add deployment remote (optional - for easy updates)
git remote add production https://github.com/Njogu-Brian/member-contributions-bank-recon.git

# Verify remotes
git remote -v
```

## Step 2: Backend Setup

### 2.1 Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install --optimize-autoloader --no-dev

# If composer is not in PATH, use full path
# /usr/local/bin/composer install --optimize-autoloader --no-dev
```

### 2.2 Configure Environment Variables

```bash
# Copy environment file
cp .env.example .env

# Edit .env file
nano .env
```

Update the following in `.env`:

```env
APP_NAME="Member Contrib Bank Recon"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://breysomsolutions.co.ke/statement
APP_TIMEZONE=Africa/Nairobi

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

# Session & Cache
SESSION_DRIVER=database
CACHE_DRIVER=file
QUEUE_CONNECTION=database

# File Storage
FILESYSTEM_DISK=local

# API Configuration
SANCTUM_STATEFUL_DOMAINS=
SESSION_DOMAIN=.breysomsolutions.co.ke

# OCR Parser Service (if running separately)
OCR_PARSER_URL=http://localhost:8001

# Matching Service (if running separately)
MATCHING_SERVICE_URL=http://localhost:8002
```

### 2.3 Generate Application Key

```bash
# Generate application key
php artisan key:generate
```

### 2.4 Set Permissions

```bash
# Set proper permissions
chmod -R 755 storage
chmod -R 755 bootstrap/cache
chown -R your-username:your-username storage
chown -R your-username:your-username bootstrap/cache
```

### 2.5 Run Migrations

```bash
# Run database migrations
php artisan migrate --force

# Seed database (if needed)
# php artisan db:seed --force
```

### 2.6 Optimize Application

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer dump-autoload --optimize
```

## Step 3: Frontend Setup

### 3.1 Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 3.2 Configure Frontend Environment

Create `frontend/.env.production`:

```env
VITE_API_URL=https://breysomsolutions.co.ke/statement/api
VITE_APP_URL=https://breysomsolutions.co.ke/statement
VITE_BASE_PATH=/statement/
```

The `vite.config.js` is already configured to use the base path from environment variable. Rebuild after environment changes:

```bash
npm run build
```

**Note:** The base path `/statement/` is important for asset loading. Make sure it matches your domain subdirectory.

## Step 4: Public Directory Setup

### 4.1 Copy Public Files to Domain Directory

```bash
# Navigate to domain public directory
cd ~/public_html/statement
# OR
cd ~/breysomsolutions.co.ke/public_html/statement

# Create directory if it doesn't exist
mkdir -p statement
cd statement

# Copy all files from backend/public
cp -r ~/laravel-ap/member-contributions/backend/public/* .

# Copy built frontend files
cp -r ~/laravel-ap/member-contributions/frontend/dist/* .
```

### 4.2 Update index.php

Edit `~/public_html/statement/index.php`:

```php
<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode
if (file_exists($maintenance = __DIR__.'/../laravel-ap/member-contributions/backend/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader
require __DIR__.'/../laravel-ap/member-contributions/backend/vendor/autoload.php';

// Bootstrap Laravel and handle the request
(require_once __DIR__.'/../laravel-ap/member-contributions/backend/bootstrap/app.php')
    ->handleRequest(Request::capture());
```

### 4.3 Create .htaccess for Public Directory

**Option 1: Use the provided template**

Copy the `.htaccess-cpanel` file:

```bash
cp ~/laravel-ap/member-contributions/.htaccess-cpanel ~/public_html/statement/.htaccess
```

**Option 2: Manual creation**

Create `~/public_html/statement/.htaccess`:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Force HTTPS (uncomment if SSL is enabled)
    # RewriteCond %{HTTPS} off
    # RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# PHP Configuration
<IfModule mod_php8.c>
    php_value upload_max_filesize 10M
    php_value post_max_size 10M
    php_value max_execution_time 300
    php_value memory_limit 256M
</IfModule>
```

## Step 5: Python Services Setup

### 5.1 OCR Parser Service

```bash
# Navigate to ocr-parser directory
cd ~/laravel-ap/member-contributions/ocr-parser

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Tesseract (if not already installed)
# sudo yum install tesseract tesseract-devel  # For CentOS
# sudo apt-get install tesseract-ocr  # For Ubuntu/Debian
```

### 5.2 Matching Service

```bash
# Navigate to matching-service directory
cd ~/laravel-ap/member-contributions/matching-service

# Install dependencies
npm install --production
```

## Step 6: Queue Worker Setup

### 6.1 Create Queue Worker Script

Create `~/laravel-ap/member-contributions/backend/queue-worker.sh`:

```bash
#!/bin/bash
cd ~/laravel-ap/member-contributions/backend
php artisan queue:work --sleep=3 --tries=3 --max-time=3600
```

Make it executable:

```bash
chmod +x queue-worker.sh
```

### 6.2 Set Up Supervisor (Recommended)

Create `/etc/supervisor/conf.d/member-contrib-queue.conf`:

```ini
[program:member-contrib-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /home2/royalce1/laravel-ap/member-contributions/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=royalce1
numprocs=2
redirect_stderr=true
stdout_logfile=/home2/royalce1/laravel-ap/member-contributions/backend/storage/logs/queue-worker.log
stopwaitsecs=3600
```

Reload supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start member-contrib-queue:*
```

## Step 7: Cron Jobs Setup

### 7.1 Set Up Laravel Scheduler

Add to crontab (`crontab -e`):

```bash
* * * * * cd /home2/royalce1/laravel-ap/member-contributions/backend && php artisan schedule:run >> /dev/null 2>&1
```

## Step 8: Services Setup (Optional)

### 8.1 Set Up OCR Parser Service (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start OCR parser service
cd ~/laravel-ap/member-contributions/ocr-parser
pm2 start python3 --name ocr-parser -- venv/bin/python app.py
pm2 save
pm2 startup
```

### 8.2 Set Up Matching Service (PM2)

```bash
# Start matching service
cd ~/laravel-ap/member-contributions/matching-service
pm2 start server.js --name matching-service
pm2 save
```

## Step 9: Update Deployment Script

Create `~/laravel-ap/member-contributions/deploy.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment...${NC}"

# Navigate to application directory
cd ~/laravel-ap/member-contributions

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin master

# Backend deployment
echo -e "${YELLOW}Deploying backend...${NC}"
cd backend
composer install --optimize-autoloader --no-dev --no-interaction
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Frontend deployment
echo -e "${YELLOW}Deploying frontend...${NC}"
cd ../frontend
npm install
npm run build

# Copy public files
echo -e "${YELLOW}Copying public files...${NC}"
cp -r dist/* ~/public_html/statement/

# Restart queue workers
echo -e "${YELLOW}Restarting queue workers...${NC}"
php ~/laravel-ap/member-contributions/backend/artisan queue:restart

# Restart services (if using PM2)
# pm2 restart ocr-parser
# pm2 restart matching-service

echo -e "${GREEN}Deployment completed successfully!${NC}"
```

Make it executable:

```bash
chmod +x deploy.sh
```

## Step 10: Database Setup

### 10.1 Create Database

1. Log into cPanel
2. Go to MySQL Databases
3. Create a new database (e.g., `royalce1_membercontrib`)
4. Create a new user (e.g., `royalce1_memberuser`)
5. Grant all privileges to the user on the database
6. Note down the database name, username, and password

### 10.2 Update .env with Database Credentials

```env
DB_DATABASE=royalce1_membercontrib
DB_USERNAME=royalce1_memberuser
DB_PASSWORD=your_password_here
```

## Step 11: SSL Certificate (Recommended)

1. Log into cPanel
2. Go to SSL/TLS Status
3. Install SSL certificate for your domain
4. Force HTTPS redirect in `.htaccess`:

```apache
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## Step 12: Initial User Creation

```bash
# Navigate to backend
cd ~/laravel-ap/member-contributions/backend

# Create admin user (if you have a seeder)
php artisan db:seed --class=UserSeeder

# Or create user via tinker
php artisan tinker
```

In tinker:
```php
$user = new App\Models\User();
$user->name = 'Admin';
$user->email = 'admin@breysomsolutions.co.ke';
$user->password = Hash::make('your-secure-password');
$user->save();
```

## Step 13: Testing Deployment

### 13.1 Test API Endpoints

```bash
# Test API health
curl https://breysomsolutions.co.ke/statement/api/health

# Test login
curl -X POST https://breysomsolutions.co.ke/statement/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@breysomsolutions.co.ke","password":"your-password"}'
```

### 13.2 Test Frontend

1. Visit: `https://breysomsolutions.co.ke/statement`
2. Verify the application loads
3. Test login functionality
4. Test file upload
5. Test transaction processing

## Step 14: Regular Updates

### 14.1 Update Code

```bash
# SSH into server
ssh your-username@your-server.com

# Navigate to application directory
cd ~/laravel-ap/member-contributions

# Pull latest changes
git pull origin master

# Run deployment script
./deploy.sh
```

### 14.2 Manual Update Steps

If not using deploy script:

```bash
# Backend
cd backend
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Frontend
cd ../frontend
npm install
npm run build
cp -r dist/* ~/public_html/statement/

# Restart queue
php artisan queue:restart
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   chmod -R 755 storage bootstrap/cache
   chown -R your-username:your-username storage bootstrap/cache
   ```

2. **500 Internal Server Error**
   - Check `storage/logs/laravel.log`
   - Verify `.env` configuration
   - Check file permissions

3. **Database Connection Error**
   - Verify database credentials in `.env`
   - Check database user permissions
   - Verify database exists

4. **Asset Loading Issues**
   - Verify `APP_URL` in `.env`
   - Check `.htaccess` configuration
   - Clear browser cache

5. **Queue Not Processing**
   - Verify queue worker is running
   - Check `storage/logs/queue-worker.log`
   - Restart queue worker

### Log Files

- Laravel Log: `backend/storage/logs/laravel.log`
- Queue Log: `backend/storage/logs/queue-worker.log`
- Apache Error Log: Check cPanel Error Logs
- PHP Error Log: Check cPanel PHP Error Log

## Security Checklist

- [ ] Set `APP_DEBUG=false` in production
- [ ] Use strong `APP_KEY`
- [ ] Use secure database passwords
- [ ] Enable SSL/HTTPS
- [ ] Set proper file permissions
- [ ] Keep dependencies updated
- [ ] Regular backups
- [ ] Firewall configuration
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled

## Backup Strategy

### Database Backup

```bash
# Create backup script
nano ~/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u royalce1_memberuser -p'your_password' royalce1_membercontrib > ~/backups/db_backup_$DATE.sql
```

### File Backup

```bash
# Backup application files
tar -czf ~/backups/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz ~/laravel-ap/member-contributions
```

## Support

For issues or questions:
- Check Laravel logs: `backend/storage/logs/laravel.log`
- Check server error logs in cPanel
- Verify all services are running
- Test API endpoints directly

## Notes

- Always test in a staging environment first
- Keep backups before major updates
- Monitor disk space and database size
- Set up monitoring for queue workers
- Regular security updates

