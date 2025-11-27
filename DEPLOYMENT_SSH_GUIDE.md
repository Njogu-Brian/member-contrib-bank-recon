# SSH Deployment Guide

This guide explains how to deploy the application to a production server via SSH.

## Prerequisites

1. **SSH Access**: You need SSH access to your production server
2. **Git**: Server must have git installed
3. **PHP & Composer**: Server must have PHP and Composer installed
4. **Node.js & npm**: Server must have Node.js and npm installed

## Option 1: Automated SSH Deployment (Linux/Mac)

### Using the Bash Script

```bash
# Make script executable
chmod +x scripts/deploy_to_server.sh

# Run with parameters
./scripts/deploy_to_server.sh <ssh_host> <ssh_user> [ssh_key] [ssh_port] [server_path] [api_url]

# Example:
./scripts/deploy_to_server.sh evimeria.breysomsolutions.co.ke username ~/.ssh/id_rsa 22 /var/www/html /api/v1
```

### Using Environment Variables

```bash
export SSH_HOST=evimeria.breysomsolutions.co.ke
export SSH_USER=username
export SSH_KEY=~/.ssh/id_rsa
export SSH_PORT=22
export SERVER_PATH=/var/www/html
export FRONTEND_API_URL=/api/v1

./scripts/deploy_to_server.sh
```

## Option 2: PowerShell SSH Deployment (Windows)

### Using the PowerShell Script

```powershell
# Run with parameters
.\scripts\deploy_ssh.ps1 -SSHHost "evimeria.breysomsolutions.co.ke" -SSHUser "username" -SSHKey "C:\path\to\key.pem" -ServerPath "/var/www/html"

# Example with all options:
.\scripts\deploy_ssh.ps1 `
    -SSHHost "evimeria.breysomsolutions.co.ke" `
    -SSHUser "username" `
    -SSHKey "C:\Users\YourName\.ssh\id_rsa" `
    -SSHPort 22 `
    -ServerPath "/var/www/html" `
    -FrontendApiUrl "/api/v1"
```

## Option 3: Manual SSH Deployment

### Step 1: Connect to Server

```bash
ssh username@evimeria.breysomsolutions.co.ke
```

### Step 2: Navigate to Project Directory

```bash
cd /var/www/html  # or your project path
```

### Step 3: Pull Latest Code

```bash
git pull origin master
```

### Step 4: Deploy Backend

```bash
cd backend

# Install dependencies
composer install --no-dev --optimize-autoloader

# Run migrations
php artisan migrate --force

# Clear and cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart queue workers
php artisan queue:restart
```

### Step 5: Deploy Frontend

```bash
cd ../frontend

# Set environment variable
export VITE_API_BASE_URL=/api/v1

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 6: Verify Build

```bash
# Check if dist folder exists
ls -la dist/

# Should see:
# - index.html
# - assets/
```

### Step 7: Deploy Frontend Files

Copy the contents of `frontend/dist/` to your web root:

```bash
# Option A: If frontend is served from a subdirectory
cp -r dist/* /var/www/html/admin/

# Option B: If frontend is the main site
cp -r dist/* /var/www/html/

# Option C: Using rsync (better for large files)
rsync -avz dist/ /var/www/html/
```

## Complete Deployment Workflow

### Local Machine

1. **Commit and Push Changes**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin master
   ```

2. **Run Local Deployment (Optional)**:
   ```powershell
   # Windows
   .\scripts\deploy_production.ps1
   
   # Or build frontend locally and upload dist/ manually
   cd frontend
   npm run build
   ```

### Server (via SSH)

1. **Pull and Deploy** (using script):
   ```bash
   ./scripts/deploy_to_server.sh <host> <user> <key>
   ```

   OR manually:
   ```bash
   cd /var/www/html
   git pull origin master
   cd backend && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan queue:restart
   cd ../frontend && export VITE_API_BASE_URL=/api/v1 && npm install && npm run build
   ```

2. **Copy Frontend Files** (if needed):
   ```bash
   cp -r frontend/dist/* /var/www/html/
   ```

## Server Configuration

### Ensure .env File Exists

On the server, make sure `backend/.env` is configured:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://evimeria.breysomsolutions.co.ke

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Web Server Configuration

#### Apache (.htaccess)

Ensure React Router works by adding to `.htaccess`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Handle React Router - send all requests to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

#### Nginx

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH connection
ssh -v username@hostname

# Use specific SSH key
ssh -i ~/.ssh/id_rsa username@hostname

# Check SSH config
cat ~/.ssh/config
```

### Permission Issues

```bash
# Fix file permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Fix storage permissions (Laravel)
chmod -R 775 /var/www/html/backend/storage
chmod -R 775 /var/www/html/backend/bootstrap/cache
```

### Build Failures

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Laravel Issues

```bash
# Clear all caches
php artisan optimize:clear

# Check routes
php artisan route:list

# Check logs
tail -f storage/logs/laravel.log

# Verify storage link
php artisan storage:link
```

## Quick Deployment Checklist

- [ ] Code committed and pushed to git
- [ ] SSH access to server configured
- [ ] Server has git, PHP, Composer, Node.js installed
- [ ] Server `.env` file configured
- [ ] Pulled latest code from git
- [ ] Backend dependencies installed
- [ ] Migrations run
- [ ] Laravel caches cleared and rebuilt
- [ ] Queue workers restarted
- [ ] Frontend dependencies installed
- [ ] Frontend built with correct API URL
- [ ] Frontend files copied to web root
- [ ] Web server configured for React Router
- [ ] Tested in browser
- [ ] Checked browser console for errors

## Post-Deployment Testing

1. **Test Login Page**:
   - Visit the login page
   - Verify logo and favicon load
   - Check "Live snapshot" shows real data
   - Verify announcements are displayed

2. **Test Settings Page**:
   - Navigate to Settings
   - Check all tabs load (Branding, Contributions, Status Rules, MFA)
   - Test MFA setup

3. **Test API Endpoints**:
   ```javascript
   // In browser console
   fetch('/api/v1/public/settings').then(r => r.json()).then(console.log)
   fetch('/api/v1/public/dashboard/snapshot').then(r => r.json()).then(console.log)
   ```

4. **Check Console for Errors**:
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

## Security Notes

- Never commit `.env` files to git
- Use SSH keys instead of passwords
- Keep SSH keys secure and use strong passphrases
- Restrict SSH access by IP if possible
- Use firewall rules to limit access
- Regularly update server software
- Monitor server logs for suspicious activity


