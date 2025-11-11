# cPanel Deployment Instructions

## Overview

This guide provides step-by-step instructions for deploying the Member Contributions Bank Reconciliation application to cPanel.

## Directory Structure

```
/home2/royalce1/
├── laravel-ap/
│   └── member-contributions/     # Your application code (Git repository)
│       ├── backend/               # Laravel backend
│       ├── frontend/              # React frontend  
│       ├── ocr-parser/            # Python OCR service
│       ├── matching-service/      # Node.js matching service
│       └── deploy.sh              # Deployment script
│
└── public_html/ (or domain folder)
    └── statement/                 # Public files served by web server
        ├── index.php              # Laravel entry point
        ├── .htaccess              # Apache configuration
        └── assets/                # Frontend build files
```

## Step-by-Step Deployment

### Step 1: SSH into Your Server

```bash
ssh your-username@your-server.com
```

### Step 2: Create Directory Structure

```bash
# Navigate to your home directory
cd ~

# Create application directory
mkdir -p laravel-ap/member-contributions

# Navigate into it
cd laravel-ap/member-contributions
```

### Step 3: Clone Repository

```bash
# Clone your repository
git clone https://github.com/Njogu-Brian/member-contributions-bank-recon.git .

# Verify files are cloned
ls -la
```

### Step 4: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install --optimize-autoloader --no-dev

# Create .env file
cp .env.example .env

# Edit .env file (use nano, vi, or your preferred editor)
nano .env
```

**Update .env with these values:**
```env
APP_NAME="Member Contrib Bank Recon"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://breysomsolutions.co.ke/statement
APP_TIMEZONE=Africa/Nairobi

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=royalce1_membercontrib
DB_USERNAME=royalce1_memberuser
DB_PASSWORD=your_database_password

SESSION_DRIVER=database
CACHE_DRIVER=file
QUEUE_CONNECTION=database
```

**Generate application key:**
```bash
php artisan key:generate
```

**Set permissions:**
```bash
chmod -R 755 storage bootstrap/cache
```

**Run migrations:**
```bash
php artisan migrate --force
```

**Cache configuration:**
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### Step 5: Setup Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create production environment file
nano .env.production
```

**Add to .env.production:**
```env
VITE_API_URL=https://breysomsolutions.co.ke/statement/api
VITE_APP_URL=https://breysomsolutions.co.ke/statement
VITE_BASE_PATH=/statement/
```

**Build for production:**
```bash
npm run build
```

### Step 6: Setup Public Directory

```bash
# Create public directory (adjust path if your domain folder is different)
mkdir -p ~/public_html/statement

# Copy built frontend files
cp -r ~/laravel-ap/member-contributions/frontend/dist/* ~/public_html/statement/

# Copy index.php template
cp ~/laravel-ap/member-contributions/public-index-cpanel.php ~/public_html/statement/index.php

# Edit index.php and update the app path
nano ~/public_html/statement/index.php
```

**Update this line in index.php:**
```php
$appPath = '/home2/royalce1/laravel-ap/member-contributions/backend';
```

**Copy .htaccess:**
```bash
cp ~/laravel-ap/member-contributions/.htaccess-cpanel ~/public_html/statement/.htaccess
```

### Step 7: Setup Database in cPanel

1. Log into cPanel
2. Go to "MySQL Databases"
3. Create a new database (e.g., `royalce1_membercontrib`)
4. Create a new user (e.g., `royalce1_memberuser`)
5. Grant all privileges to the user on the database
6. Note down the database name, username, and password
7. Update `backend/.env` with these credentials

### Step 8: Setup Queue Worker

**Option 1: Manual (for testing)**
```bash
cd ~/laravel-ap/member-contributions/backend
php artisan queue:work
```

**Option 2: Supervisor (recommended for production)**

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

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start member-contrib-queue:*
```

### Step 9: Create Admin User

```bash
cd ~/laravel-ap/member-contributions/backend
php artisan tinker
```

In tinker:
```php
$user = new App\Models\User();
$user->name = 'Admin';
$user->email = 'admin@breysomsolutions.co.ke';
$user->password = Hash::make('your-secure-password');
$user->save();
exit
```

### Step 10: Test Deployment

1. Visit: `https://breysomsolutions.co.ke/statement`
2. Test login with admin credentials
3. Test file upload
4. Verify queue processing
5. Check logs: `tail -f ~/laravel-ap/member-contributions/backend/storage/logs/laravel.log`

## Using Deployment Script

For future updates, you can use the deployment script:

```bash
# Make script executable
chmod +x ~/laravel-ap/member-contributions/deploy.sh

# Edit script and update paths if needed
nano ~/laravel-ap/member-contributions/deploy.sh

# Run deployment
cd ~/laravel-ap/member-contributions
./deploy.sh
```

## Regular Updates

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

## Troubleshooting

### 500 Internal Server Error
- Check `backend/storage/logs/laravel.log`
- Verify `.env` configuration
- Check file permissions: `chmod -R 755 storage bootstrap/cache`

### Assets Not Loading
- Verify `VITE_BASE_PATH=/statement/` in frontend `.env.production`
- Rebuild frontend: `cd frontend && npm run build`
- Clear browser cache

### Database Connection Error
- Verify database credentials in `.env`
- Check database exists in cPanel
- Verify user has proper permissions

### Queue Not Processing
- Check queue worker is running
- Verify `QUEUE_CONNECTION=database` in `.env`
- Check `storage/logs/queue-worker.log`

## File Permissions

```bash
cd ~/laravel-ap/member-contributions/backend
chmod -R 755 storage bootstrap/cache
chown -R your-username:your-username storage bootstrap/cache
```

## SSL Certificate

1. Log into cPanel
2. Go to "SSL/TLS Status"
3. Install SSL certificate for your domain
4. Uncomment HTTPS redirect in `.htaccess`:

```apache
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## Important Notes

- Always test in a staging environment first
- Keep backups before major updates
- Monitor disk space and database size
- Set up monitoring for queue workers
- Regular security updates
- Keep dependencies updated

## Support

For detailed instructions, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Quick reference guide
- [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Deployment summary

## Next Steps

- Set up automated backups
- Configure monitoring
- Set up cron jobs for scheduled tasks
- Enable firewall rules
- Set up email notifications

