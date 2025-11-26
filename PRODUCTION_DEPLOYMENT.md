# Production Deployment Guide

## Problem Summary

The production site is showing 404 errors with double prefixes like `api/v1/v1/admin/admin/settings`. This indicates:
1. The frontend build is outdated
2. The `VITE_API_BASE_URL` environment variable may be incorrectly configured
3. New features (Settings page, MFA, etc.) are not visible because the frontend hasn't been rebuilt

## Solution Steps

### 1. Frontend Build for Production

The React frontend needs to be built and deployed. The built files will be in `frontend/dist/`.

#### Step 1: Set Environment Variables

Create a `.env.production` file in the `frontend/` directory (or set environment variables on your production server):

```env
VITE_API_BASE_URL=/api/v1
```

**IMPORTANT**: The base URL should be `/api/v1` (relative path), NOT a full URL like `https://evimeria.breysomsolutions.co.ke/api/v1/api/v1`.

#### Step 2: Build the Frontend

```bash
cd frontend
npm install  # Install any new dependencies
npm run build  # Build for production
```

This creates optimized production files in `frontend/dist/`.

#### Step 3: Deploy Frontend Files

Copy the contents of `frontend/dist/` to your production web server. The exact location depends on your hosting setup:

- **cPanel**: Usually `public_html/` or `public_html/admin/`
- **Apache/Nginx**: Document root directory
- **Cloud Hosting**: Follow your provider's instructions

**Files to copy:**
- All files and folders from `frontend/dist/`
- Ensure `index.html` is in the correct location

### 2. Backend Deployment

#### Step 1: Pull Latest Changes

```bash
cd backend
git pull origin main  # or your branch name
```

#### Step 2: Update Dependencies

```bash
composer install --no-dev --optimize-autoloader
```

#### Step 3: Run Migrations

```bash
php artisan migrate --force
```

#### Step 4: Clear and Cache Configuration

```bash
php artisan config:clear
php artisan config:cache
php artisan route:clear
php artisan route:cache
php artisan view:clear
php artisan view:cache
```

#### Step 5: Restart Queue Workers

```bash
php artisan queue:restart
```

### 3. Verify Deployment

#### Check Frontend Build Version

Open browser console and check:
- No 404 errors for API calls
- API calls should be to `/api/v1/admin/...` or `/api/v1/admin/admin/...` (NOT double `v1/v1`)

#### Check New Features

1. **Settings Page**: Navigate to `/settings` - should show branding, contributions, status rules, and MFA tabs
2. **MFA**: Go to Settings → MFA tab - should show Google Authenticator setup
3. **Navigation**: Settings should appear in the sidebar under "ADMINISTRATION"
4. **Login Page**: Should show logo, favicon, live statistics, and announcements

#### Check API Endpoints

Test these endpoints in browser console or Postman:

```javascript
// Public settings (should work without auth)
fetch('/api/v1/public/settings').then(r => r.json()).then(console.log)

// Dashboard snapshot (should work without auth)
fetch('/api/v1/public/dashboard/snapshot').then(r => r.json()).then(console.log)

// Admin settings (requires auth)
fetch('/api/v1/admin/admin/settings', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
}).then(r => r.json()).then(console.log)
```

## Common Issues and Fixes

### Issue 1: Double Prefix `api/v1/v1`

**Symptom**: Console shows errors like `api/v1/v1/admin/admin/settings`

**Cause**: `VITE_API_BASE_URL` is set incorrectly in production

**Fix**: 
1. Check `.env.production` or production environment variables
2. Set `VITE_API_BASE_URL=/api/v1` (relative path)
3. Rebuild frontend: `npm run build`
4. Redeploy `frontend/dist/` contents

### Issue 2: 404 Errors for All API Calls

**Cause**: 
- Frontend build is outdated
- Backend routes not cached/cleared
- Routes not matching expected paths

**Fix**:
1. Rebuild frontend
2. Clear backend route cache: `php artisan route:clear && php artisan route:cache`
3. Verify routes: `php artisan route:list --path=api/v1`

### Issue 3: Settings Page Not Showing

**Cause**: Frontend build doesn't include Settings page

**Fix**:
1. Ensure Settings.jsx exists in `frontend/src/pages/`
2. Ensure Settings route is in `frontend/src/App.jsx`
3. Rebuild frontend
4. Clear browser cache (Ctrl+Shift+R)

### Issue 4: Logo/Favicon Not Loading

**Cause**: Public settings endpoint not accessible or files not uploaded

**Fix**:
1. Verify public endpoint: `/api/v1/public/settings`
2. Check storage symlink: `php artisan storage:link`
3. Check file permissions on storage directory
4. Verify logo/favicon files are in `backend/storage/app/public/`

## Deployment Checklist

- [ ] Pull latest code from git
- [ ] Update backend dependencies (`composer install`)
- [ ] Run migrations (`php artisan migrate --force`)
- [ ] Clear and cache configs (`php artisan config:cache`, `route:cache`)
- [ ] Restart queue workers (`php artisan queue:restart`)
- [ ] Set `VITE_API_BASE_URL=/api/v1` for frontend build
- [ ] Install frontend dependencies (`npm install`)
- [ ] Build frontend (`npm run build`)
- [ ] Copy `frontend/dist/` contents to production web root
- [ ] Verify `.htaccess` or nginx config allows React Router
- [ ] Test Settings page loads
- [ ] Test API endpoints return data
- [ ] Check browser console for errors
- [ ] Clear browser cache and test again

## Quick Deployment Script

For automated deployment, see `scripts/deploy_backend.ps1` and create `scripts/deploy_frontend_production.ps1`:

```powershell
# Run deployment script directly:
.\scripts\deploy_production.ps1

# Or if you get execution policy errors:
powershell -ExecutionPolicy Bypass -File .\scripts\deploy_production.ps1
```

For a custom frontend-only deployment script, see `scripts/deploy_frontend_react.ps1`

## Server Configuration

### Apache (.htaccess)

Ensure your web server's `.htaccess` includes React Router support:

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

### Nginx

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## Troubleshooting Commands

```bash
# Check backend routes
php artisan route:list --path=api/v1

# Check if migrations are pending
php artisan migrate:status

# Clear all caches
php artisan optimize:clear

# Check queue workers
php artisan queue:work --once

# Verify storage link
php artisan storage:link

# Check Laravel logs
tail -f storage/logs/laravel.log
```

## Next Steps After Deployment

1. Monitor error logs for the first 24 hours
2. Test all critical features (login, settings, MFA, etc.)
3. Verify API responses are correct
4. Check browser console for any JavaScript errors
5. Test on different browsers (Chrome, Firefox, Safari)

## Contact & Support

If issues persist after following this guide:
1. Check browser console for specific error messages
2. Check backend logs in `backend/storage/logs/laravel.log`
3. Verify API endpoints are accessible
4. Check network tab in browser dev tools for failed requests

