# Deployment Summary for cPanel

## Overview

This document provides a quick overview of the deployment process for the Member Contributions Bank Reconciliation application on cPanel.

## Directory Structure

```
/home2/royalce1/
├── laravel-ap/
│   └── member-contributions/          # Application code (Git repository)
│       ├── backend/                    # Laravel backend
│       ├── frontend/                   # React frontend
│       ├── ocr-parser/                 # Python OCR service
│       ├── matching-service/           # Node.js matching service
│       ├── deploy.sh                   # Deployment script
│       ├── public-index-cpanel.php     # Template for public index.php
│       └── .htaccess-cpanel            # Template for .htaccess
│
└── public_html/ (or domain folder)
    └── statement/                      # Public files (served by web server)
        ├── index.php                   # Laravel entry point
        ├── .htaccess                   # Apache configuration
        └── assets/                     # Frontend build files
```

## Key Points

1. **Application Code**: Stored in `~/laravel-ap/member-contributions/`
2. **Public Files**: Stored in `~/public_html/statement/` (or domain folder)
3. **Git Repository**: Cloned in application directory
4. **Database**: MySQL database created in cPanel
5. **Queue Worker**: Runs via Supervisor or manual process
6. **Services**: OCR parser and matching service (optional, can run via PM2)

## Quick Deployment Steps

### 1. Initial Setup

```bash
# SSH into server
ssh your-username@your-server.com

# Create directory and clone repository
mkdir -p ~/laravel-ap/member-contributions
cd ~/laravel-ap/member-contributions
git clone https://github.com/Njogu-Brian/member-contributions-bank-recon.git .
```

### 2. Backend Setup

```bash
cd backend
composer install --optimize-autoloader --no-dev
cp .env.example .env
# Edit .env with database credentials
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
# Create .env.production with VITE_API_URL and VITE_BASE_PATH
npm run build
```

### 4. Public Directory Setup

```bash
# Create public directory
mkdir -p ~/public_html/statement

# Copy built frontend files
cp -r ~/laravel-ap/member-contributions/frontend/dist/* ~/public_html/statement/

# Copy index.php template
cp ~/laravel-ap/member-contributions/public-index-cpanel.php ~/public_html/statement/index.php

# Edit index.php and update $appPath
nano ~/public_html/statement/index.php
# Update: $appPath = '/home2/royalce1/laravel-ap/member-contributions/backend';

# Copy .htaccess
cp ~/laravel-ap/member-contributions/.htaccess-cpanel ~/public_html/statement/.htaccess
```

### 5. Queue Worker

```bash
# Option 1: Manual (for testing)
cd ~/laravel-ap/member-contributions/backend
php artisan queue:work

# Option 2: Supervisor (recommended for production)
# See DEPLOYMENT.md for Supervisor configuration
```

### 6. Update Code (Future Deployments)

```bash
# Navigate to application directory
cd ~/laravel-ap/member-contributions

# Pull latest changes
git pull origin master

# Run deployment script
./deploy.sh
```

## Important Configuration Files

### Backend .env

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://breysomsolutions.co.ke/statement

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

### Frontend .env.production

```env
VITE_API_URL=https://breysomsolutions.co.ke/statement/api
VITE_APP_URL=https://breysomsolutions.co.ke/statement
VITE_BASE_PATH=/statement/
```

### Public index.php

Update the `$appPath` variable to point to your Laravel backend:

```php
$appPath = '/home2/royalce1/laravel-ap/member-contributions/backend';
```

## File Permissions

```bash
cd ~/laravel-ap/member-contributions/backend
chmod -R 755 storage bootstrap/cache
chown -R your-username:your-username storage bootstrap/cache
```

## Database Setup

1. Log into cPanel
2. Go to "MySQL Databases"
3. Create database: `royalce1_membercontrib`
4. Create user: `royalce1_memberuser`
5. Grant all privileges
6. Update `.env` with credentials

## Testing Deployment

1. Visit: `https://breysomsolutions.co.ke/statement`
2. Test login functionality
3. Test file upload
4. Verify queue processing
5. Check logs: `tail -f backend/storage/logs/laravel.log`

## Troubleshooting

### 500 Error
- Check `backend/storage/logs/laravel.log`
- Verify `.env` configuration
- Check file permissions

### Assets Not Loading
- Verify `VITE_BASE_PATH=/statement/` in frontend `.env.production`
- Rebuild frontend: `npm run build`
- Clear browser cache

### Database Connection Error
- Verify database credentials in `.env`
- Check database exists in cPanel
- Verify user has proper permissions

### Queue Not Processing
- Check queue worker is running
- Verify `QUEUE_CONNECTION=database` in `.env`
- Check `storage/logs/queue-worker.log`

## Deployment Script

The `deploy.sh` script automates the deployment process:

```bash
# Make executable
chmod +x deploy.sh

# Update paths in deploy.sh if needed
nano deploy.sh

# Run deployment
./deploy.sh
```

## Regular Updates

For regular updates, simply:

```bash
cd ~/laravel-ap/member-contributions
git pull origin master
./deploy.sh
```

## Security Checklist

- [ ] Set `APP_DEBUG=false` in production
- [ ] Use strong `APP_KEY`
- [ ] Use secure database passwords
- [ ] Enable SSL/HTTPS
- [ ] Set proper file permissions
- [ ] Keep dependencies updated
- [ ] Regular backups
- [ ] Firewall configuration

## Support

For detailed instructions, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Quick reference guide

## Notes

- Always test in a staging environment first
- Keep backups before major updates
- Monitor disk space and database size
- Set up monitoring for queue workers
- Regular security updates

