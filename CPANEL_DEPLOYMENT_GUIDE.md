# cPanel Deployment Guide for Evimeria System

This guide provides step-by-step instructions for deploying the Laravel application to cPanel with the specified configuration.

## Overview

- **Domain/Subdomain**: `evimeria.breysomsolutions.co.ke`
- **Public Files Location**: `public_html/evimeria.breysomsolutions.co.ke` (or `evimeria.breysomsolutions.co.ke` folder)
- **Private Laravel Files Location**: `~/laravel-app/evimeria` (home directory)
- **GitHub Integration**: Set up for automated deployments via Git

---

## Prerequisites

- cPanel access with terminal/SSH access enabled
- GitHub repository access
- PHP 8.1 or higher
- Composer installed (or ability to install via SSH)

---

## Step 1: Set Up SSH Keys for GitHub

Since your terminal doesn't support composer commands directly, we'll set up SSH keys to enable secure GitHub access and composer operations.

### 1.1 Generate SSH Key Pair (on your local machine or via SSH)

If you have SSH access to the server, connect via SSH:

```bash
ssh username@your-server.com
```

Then generate SSH keys:

```bash
# Navigate to home directory
cd ~

# Generate SSH key pair
ssh-keygen -t ed25519 -C "your-email@example.com"

# When prompted:
# - Press Enter to accept default file location (~/.ssh/id_ed25519)
# - Enter a passphrase (optional but recommended) or press Enter for no passphrase
```

**If you don't have SSH access**, you can generate keys locally and upload the public key to the server:

**On Windows (PowerShell):**
```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# View public key to copy
cat ~/.ssh/id_ed25519.pub
```

### 1.2 Add SSH Key to GitHub

1. Copy your **public key** content:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. Go to GitHub → Settings → SSH and GPG keys → New SSH key
3. Paste your public key
4. Save

### 1.3 Configure SSH for GitHub in cPanel

If using SSH on the server:

```bash
# Test GitHub connection
ssh -T git@github.com

# If prompted to add GitHub to known_hosts, type 'yes'
```

**If using cPanel Terminal without direct SSH:**
- Use cPanel's "Terminal" or "SSH Access" feature
- Or configure SSH keys through cPanel's "SSH/Shell Access" interface

---

## Step 2: Create Directory Structure

### 2.1 Create Private Laravel Directory

Via cPanel Terminal or SSH:

```bash
# Navigate to home directory
cd ~

# Create laravel-app directory if it doesn't exist
mkdir -p laravel-app

# Create evimeria directory
mkdir -p laravel-app/evimeria

# Navigate into it
cd laravel-app/evimeria
```

### 2.2 Locate Public Directory

Find your public directory path. It's typically one of:
- `public_html/evimeria.breysomsolutions.co.ke`
- `evimeria.breysomsolutions.co.ke` (in home directory)
- `public_html` (if it's the main domain)

Check with:
```bash
cd ~
ls -la
# Look for public_html or the subdomain folder
```

---

## Step 3: Clone Repository

### 3.1 Clone GitHub Repository

In the private Laravel directory:

```bash
cd ~/laravel-app/evimeria

# Clone your repository (replace with your actual repo URL)
git clone git@github.com:your-username/Evimeria_System.git .

# Or if using HTTPS (you'll need to enter credentials):
# git clone https://github.com/your-username/Evimeria_System.git .
```

**Note**: The `.` at the end clones directly into the current directory.

### 3.2 Navigate to Backend Directory

```bash
cd backend
```

---

## Step 4: Install Dependencies via SSH

Since the terminal doesn't support composer directly, use SSH or cPanel's composer if available:

### Option A: Using SSH (Recommended)

If you have SSH access:

```bash
# Make sure composer is installed globally or use php composer.phar
composer install --no-dev --optimize-autoloader

# If composer isn't installed, download it:
# curl -sS https://getcomposer.org/installer | php
# php composer.phar install --no-dev --optimize-autoloader
```

### Option B: Using cPanel's Composer

1. Go to cPanel → Software → PHP Selector (if available)
2. Or use cPanel's Terminal → find composer location
3. Run: `php /usr/local/bin/composer install --no-dev --optimize-autoloader`

### Option C: Upload vendor Folder

If composer is not available:
1. Install dependencies locally on your machine
2. Upload the entire `vendor` folder via FTP/cPanel File Manager
3. Make sure file permissions are correct

---

## Step 5: Configure Environment File

### 5.1 Create .env File

```bash
cd ~/laravel-app/evimeria/backend

# Copy example file
cp .env.example .env

# Or create manually if .env.example doesn't exist
touch .env
```

### 5.2 Configure .env Settings

Edit the `.env` file with your production settings:

```bash
nano .env
# or use cPanel File Manager
```

**Required .env Settings:**

```env
APP_NAME="Evimeria System"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://evimeria.breysomsolutions.co.ke

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

# Session configuration (important for cPanel)
SESSION_DRIVER=file
SESSION_LIFETIME=120

# Cache configuration
CACHE_DRIVER=file
QUEUE_CONNECTION=sync

# Add any other required environment variables
```

### 5.3 Generate Application Key

```bash
php artisan key:generate
```

---

## Step 6: Set Up Database

### 6.1 Create Database in cPanel

1. Go to cPanel → MySQL Databases
2. Create a new database (e.g., `username_evimeria`)
3. Create a database user
4. Add user to database with ALL PRIVILEGES
5. Note the database name, username, and password

### 6.2 Update .env with Database Credentials

Update the `.env` file with your database details from step 6.1

### 6.3 Run Migrations

```bash
cd ~/laravel-app/evimeria/backend
php artisan migrate --force
```

---

## Step 7: Configure Public Directory

### 7.1 Set Up Public Folder Symlink

The public files should point to Laravel's public directory. We'll create a symlink or copy files:

**Option A: Symlink (Recommended if supported by hosting)**

```bash
# Navigate to your public directory
cd ~/public_html/evimeria.breysomsolutions.co.ke
# or
cd ~/evimeria.breysomsolutions.co.ke

# Remove any existing files (backup first!)
# Then create symlink to Laravel public directory
ln -s ~/laravel-app/evimeria/backend/public/* .
ln -s ~/laravel-app/evimeria/backend/public/.htaccess .
```

**Option B: Modify index.php (If symlinks aren't supported)**

If your hosting doesn't support symlinks, modify the public directory's index.php:

1. Copy `backend/public/index.php` to your public directory
2. Edit it to point to the correct paths:

```php
<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

require __DIR__.'/../../laravel-app/evimeria/backend/vendor/autoload.php';

$app = require_once __DIR__.'/../../laravel-app/evimeria/backend/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
```

### 7.2 Update Laravel Paths in Public index.php

If using Option B, update paths in `backend/public/index.php`:

```php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
```

---

## Step 8: Set File Permissions

Set proper permissions for Laravel:

```bash
cd ~/laravel-app/evimeria/backend

# Set directory permissions
find . -type d -exec chmod 755 {} \;

# Set file permissions
find . -type f -exec chmod 644 {} \;

# Set storage and bootstrap/cache permissions
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# If needed, set ownership (replace username with your cPanel username)
# chown -R username:username storage bootstrap/cache
```

---

## Step 9: Configure .htaccess

### 9.1 Public Directory .htaccess

Ensure your public directory has a `.htaccess` file with these contents:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

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
```

### 9.2 Private Directory .htaccess (Security)

Add a `.htaccess` file in `~/laravel-app/evimeria` to prevent direct access:

```apache
# Deny all access
<IfModule mod_authz_core.c>
    Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
    Order deny,allow
    Deny from all
</IfModule>
```

---

## Step 10: Set Up Automated Deployment via GitHub

### 10.1 Create Deployment Script

Create a deployment script in `~/laravel-app/evimeria`:

```bash
nano ~/laravel-app/evimeria/deploy.sh
```

Add the following content:

```bash
#!/bin/bash

# Deployment script for Evimeria System
cd ~/laravel-app/evimeria

# Pull latest changes
git pull origin main
# or git pull origin master (depending on your default branch)

# Navigate to backend
cd backend

# Install/update dependencies
composer install --no-dev --optimize-autoloader

# Run migrations
php artisan migrate --force

# Clear and cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Clear application cache
php artisan cache:clear

# Set permissions
chmod -R 755 storage bootstrap/cache

echo "Deployment completed successfully!"
```

Make it executable:

```bash
chmod +x ~/laravel-app/evimeria/deploy.sh
```

### 10.2 Set Up GitHub Webhook (Optional)

For automatic deployments on git push:

1. In your GitHub repository, go to Settings → Webhooks
2. Add webhook:
   - Payload URL: `https://evimeria.breysomsolutions.co.ke/webhook/deploy` (you'll need to create this route)
   - Content type: `application/json`
   - Secret: (create a secure secret)
   - Events: Just the push event

### 10.3 Manual Deployment

For manual deployments, simply run:

```bash
cd ~/laravel-app/evimeria
./deploy.sh
```

Or manually:

```bash
cd ~/laravel-app/evimeria
git pull
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Step 11: Configure PHP Settings

### 11.1 Check PHP Version

Ensure PHP 8.1+ is enabled:

```bash
php -v
```

### 11.2 Update PHP Settings in cPanel

1. Go to cPanel → Select PHP Version
2. Choose PHP 8.1 or higher
3. Enable required extensions:
   - `pdo_mysql`
   - `mbstring`
   - `openssl`
   - `tokenizer`
   - `xml`
   - `ctype`
   - `json`
   - `fileinfo`
   - `gd` (if using image processing)
   - `zip`

### 11.3 Set PHP.ini Values

In cPanel → MultiPHP INI Editor, set:

```ini
upload_max_filesize = 10M
post_max_size = 10M
memory_limit = 256M
max_execution_time = 300
```

---

## Step 12: Test the Application

### 12.1 Verify Installation

1. Visit `https://evimeria.breysomsolutions.co.ke`
2. Check if Laravel loads correctly
3. Test API endpoints if applicable

### 12.2 Check Logs

If errors occur, check Laravel logs:

```bash
cd ~/laravel-app/evimeria/backend
tail -f storage/logs/laravel.log
```

---

## Step 13: Security Hardening

### 13.1 Protect Sensitive Files

Ensure these are not publicly accessible:
- `.env`
- `composer.json`, `composer.lock`
- `package.json`
- `storage/`
- `vendor/`

### 13.2 SSL Certificate

1. Go to cPanel → SSL/TLS Status
2. Install SSL certificate for `evimeria.breysomsolutions.co.ke`
3. Force HTTPS by updating `.env`:
   ```env
   APP_URL=https://evimeria.breysomsolutions.co.ke
   ```

### 13.3 Update .env for Production

```env
APP_DEBUG=false
APP_ENV=production
```

---

## Troubleshooting

### Issue: Composer command not found

**Solution**: Install composer via SSH or use cPanel's composer:
```bash
curl -sS https://getcomposer.org/installer | php
php composer.phar install --no-dev --optimize-autoloader
```

### Issue: Permission denied errors

**Solution**: Adjust permissions:
```bash
chmod -R 775 storage bootstrap/cache
chown -R username:username storage bootstrap/cache
```

### Issue: 500 Internal Server Error

**Solution**: 
1. Check `.env` file exists and is configured correctly
2. Check file permissions
3. Check Laravel logs: `storage/logs/laravel.log`
4. Verify PHP version and extensions

### Issue: Database connection failed

**Solution**:
1. Verify database credentials in `.env`
2. Ensure database user has proper privileges
3. Check if database host should be `localhost` or `127.0.0.1`

### Issue: Git pull requires credentials

**Solution**: Set up SSH keys (Step 1) or use a GitHub Personal Access Token

---

## Quick Reference Commands

```bash
# Navigate to Laravel directory
cd ~/laravel-app/evimeria/backend

# Pull latest changes
cd ~/laravel-app/evimeria && git pull

# Update dependencies
composer install --no-dev --optimize-autoloader

# Run migrations
php artisan migrate --force

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Cache for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Check logs
tail -f storage/logs/laravel.log

# Run deployment script
cd ~/laravel-app/evimeria && ./deploy.sh
```

---

## Directory Structure Summary

```
~/
├── laravel-app/
│   └── evimeria/
│       ├── backend/           # All Laravel files (private)
│       │   ├── app/
│       │   ├── bootstrap/
│       │   ├── config/
│       │   ├── database/
│       │   ├── public/        # Contains index.php
│       │   ├── resources/
│       │   ├── routes/
│       │   ├── storage/
│       │   ├── vendor/
│       │   ├── .env
│       │   └── composer.json
│       └── deploy.sh          # Deployment script
│
└── public_html/
    └── evimeria.breysomsolutions.co.ke/  # Public files (symlinked from backend/public)
        ├── index.php          # Points to Laravel
        ├── .htaccess
        └── (other public assets)
```

---

## Next Steps

1. ✅ Set up SSH keys for GitHub
2. ✅ Clone repository to `~/laravel-app/evimeria`
3. ✅ Install dependencies via composer
4. ✅ Configure `.env` file
5. ✅ Set up database and run migrations
6. ✅ Configure public directory symlink/index.php
7. ✅ Set file permissions
8. ✅ Test the application
9. ✅ Set up automated deployment

---

## Support

For issues:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check cPanel error logs
3. Verify file permissions and paths
4. Ensure PHP version and extensions are correct

Good luck with your deployment! 🚀
