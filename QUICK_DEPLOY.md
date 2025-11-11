# Quick Deployment Guide for cPanel

## Prerequisites Checklist

- [ ] SSH access to cPanel server
- [ ] Git installed on server
- [ ] PHP 8.1+ with Composer
- [ ] Node.js and npm
- [ ] MySQL database created in cPanel
- [ ] Python 3.9+ (for OCR parser)
- [ ] Tesseract OCR installed

## Quick Start (5 Steps)

### Step 1: Create Directory Structure

```bash
# SSH into your server
ssh your-username@your-server.com

# Create application directory
mkdir -p ~/laravel-ap/member-contributions
cd ~/laravel-ap/member-contributions

# Clone repository
git clone https://github.com/Njogu-Brian/member-contributions-bank-recon.git .
```

### Step 2: Setup Backend

```bash
cd backend

# Install dependencies
composer install --optimize-autoloader --no-dev

# Create .env file
cp .env.example .env
nano .env  # Edit with your database credentials

# Generate key
php artisan key:generate

# Set permissions
chmod -R 755 storage bootstrap/cache

# Run migrations
php artisan migrate --force

# Cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Step 3: Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 4: Setup Public Directory

```bash
# Create public directory (adjust path to your domain folder)
mkdir -p ~/public_html/statement
# OR if using domain folder:
# mkdir -p ~/breysomsolutions.co.ke/public_html/statement

# Copy built files
cp -r ~/laravel-ap/member-contributions/frontend/dist/* ~/public_html/statement/

# Copy Laravel index.php
cp ~/laravel-ap/member-contributions/backend/public/index.php ~/public_html/statement/

# Copy .htaccess
cp ~/laravel-ap/member-contributions/backend/public/.htaccess ~/public_html/statement/
```

### Step 5: Update index.php for cPanel

Edit `~/public_html/statement/index.php` and update the paths:

```php
// Update this line to point to your Laravel app
$appPath = $_ENV['APP_BASE_PATH'] ?? '/home2/royalce1/laravel-ap/member-contributions/backend';
```

## Environment Configuration

### Backend .env

Update `backend/.env`:

```env
APP_NAME="Member Contrib Bank Recon"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://breysomsolutions.co.ke/statement

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

SESSION_DRIVER=database
CACHE_DRIVER=file
QUEUE_CONNECTION=database
```

### Frontend .env.production

Create `frontend/.env.production`:

```env
VITE_API_URL=https://breysomsolutions.co.ke/statement/api
```

Then rebuild:
```bash
cd frontend
npm run build
```

## Queue Worker Setup

### Option 1: Manual (Quick Test)

```bash
cd ~/laravel-ap/member-contributions/backend
php artisan queue:work
```

### Option 2: Supervisor (Recommended)

Create `/etc/supervisor/conf.d/member-contrib-queue.conf`:

```ini
[program:member-contrib-queue]
command=php /home2/royalce1/laravel-ap/member-contributions/backend/artisan queue:work --sleep=3 --tries=3
autostart=true
autorestart=true
user=royalce1
numprocs=2
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start member-contrib-queue:*
```

## Using Deployment Script

1. Make script executable:
```bash
chmod +x ~/laravel-ap/member-contributions/deploy.sh
```

2. Update paths in `deploy.sh`:
```bash
nano ~/laravel-ap/member-contributions/deploy.sh
```

3. Run deployment:
```bash
~/laravel-ap/member-contributions/deploy.sh
```

## Regular Updates

```bash
# SSH into server
ssh your-username@your-server.com

# Navigate to app directory
cd ~/laravel-ap/member-contributions

# Pull latest changes
git pull origin master

# Run deployment script
./deploy.sh
```

## Troubleshooting

### 500 Error
- Check `backend/storage/logs/laravel.log`
- Verify `.env` configuration
- Check file permissions: `chmod -R 755 storage bootstrap/cache`

### Assets Not Loading
- Verify `APP_URL` in `.env`
- Clear browser cache
- Check `.htaccess` is present

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
# Set proper permissions
cd ~/laravel-ap/member-contributions/backend
chmod -R 755 storage bootstrap/cache
chown -R your-username:your-username storage bootstrap/cache
```

## Database Setup in cPanel

1. Log into cPanel
2. Go to "MySQL Databases"
3. Create database: `royalce1_membercontrib`
4. Create user: `royalce1_memberuser`
5. Grant all privileges
6. Note credentials and update `.env`

## SSL Certificate

1. Log into cPanel
2. Go to "SSL/TLS Status"
3. Install SSL certificate
4. Force HTTPS in `.htaccess`:

```apache
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## Create Admin User

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
```

## Testing Deployment

1. Visit: `https://breysomsolutions.co.ke/statement`
2. Test login
3. Test file upload
4. Verify queue processing
5. Check logs: `tail -f backend/storage/logs/laravel.log`

## Next Steps

- Set up automated backups
- Configure monitoring
- Set up cron jobs for scheduled tasks
- Enable firewall rules
- Set up email notifications

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

