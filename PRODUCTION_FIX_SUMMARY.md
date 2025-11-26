# Production Deployment Fix - Summary

## Current Issue

Production site shows 404 errors with **double prefixes** like:
- `api/v1/v1/admin/admin/settings` ❌
- `api/v1/v1/admin/admin/roles` ❌
- `api/v1/v1/admin/admin/staff` ❌

This means the frontend build is outdated and the `VITE_API_BASE_URL` environment variable is incorrectly configured.

## Root Cause

1. **Frontend not rebuilt**: The React frontend hasn't been built and deployed with latest changes
2. **Incorrect API base URL**: Production build likely has `VITE_API_BASE_URL` set to `/api/v1/api/v1` or similar
3. **Missing updates**: All recent features (Settings page, MFA, public endpoints) are not in production

## Quick Fix Steps

### Option 1: Automated Deployment (Recommended)

Run the deployment script:

```powershell
cd D:\Projects\Evimeria_System
.\scripts\deploy_production.ps1
```

Or if you get execution policy errors:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy_production.ps1
```

This will:
1. Update backend dependencies
2. Run migrations
3. Clear and cache routes
4. Build React frontend with correct API base URL
5. Generate production files in `frontend/dist/`

Then copy `frontend/dist/` contents to your production web server.

### Option 2: Manual Deployment

#### Backend:
```bash
cd backend
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan queue:restart
```

#### Frontend:
```bash
cd frontend
npm install
# IMPORTANT: Set the correct API base URL
$env:VITE_API_BASE_URL = "/api/v1"
npm run build
```

Then copy `frontend/dist/` contents to production web server.

## Correct API Base URL Configuration

The `VITE_API_BASE_URL` should be set to:

```env
VITE_API_BASE_URL=/api/v1
```

**NOT**:
- ❌ `/api/v1/api/v1` (double prefix)
- ❌ `https://evimeria.breysomsolutions.co.ke/api/v1/api/v1`
- ❌ `https://evimeria.breysomsolutions.co.ke/api/v1` (full URL - may cause CORS issues)

**YES**:
- ✅ `/api/v1` (relative path)

## Expected API Calls After Fix

After deployment, API calls should be:
- ✅ `/api/v1/admin/admin/settings`
- ✅ `/api/v1/admin/admin/roles`
- ✅ `/api/v1/admin/admin/staff`
- ✅ `/api/v1/public/settings`
- ✅ `/api/v1/public/dashboard/snapshot`

## Verification Checklist

After deployment, verify:

- [ ] No 404 errors in browser console
- [ ] Settings page loads at `/admin/settings`
- [ ] MFA tab appears in Settings
- [ ] Staff Management page loads with data
- [ ] Role Management page loads
- [ ] Login page shows logo, favicon, statistics, and announcements
- [ ] API calls use correct single prefixes (not double `v1/v1`)

## Files Changed Recently (Not in Production)

These features need the frontend rebuild:

1. **Settings Page** (`frontend/src/pages/Settings.jsx`)
   - Branding tab
   - Contributions tab
   - Status Rules tab
   - MFA tab (Google Authenticator)

2. **Settings Context** (`frontend/src/context/SettingsContext.jsx`)
   - Dynamic CSS variables
   - Favicon updates

3. **Login Page** (`frontend/src/pages/Login.jsx`)
   - Live statistics
   - Announcements section
   - Public settings endpoint integration

4. **Navigation** (`frontend/src/config/navigation.js`)
   - Settings link added

5. **Public API Endpoints** (Backend)
   - `/api/v1/public/settings`
   - `/api/v1/public/dashboard/snapshot`
   - `/api/v1/public/announcements`

## Server Configuration

Ensure your production server:

1. **Serves React Router properly**: All routes should redirect to `index.html`
   - Apache: `.htaccess` with mod_rewrite
   - Nginx: `try_files $uri $uri/ /index.html;`

2. **Has correct file permissions**:
   - `storage/` directory writable
   - `public/storage` symlinked

3. **Queue workers running**:
   ```bash
   php artisan queue:work
   ```

## Next Steps After Deployment

1. **Clear browser cache**: Ctrl+Shift+R or Ctrl+F5
2. **Test all pages**: Settings, Staff, Roles, Login
3. **Check browser console**: Ensure no errors
4. **Monitor logs**: Check `backend/storage/logs/laravel.log` for errors

## Support

If issues persist:
1. Check browser console for specific errors
2. Verify API endpoints are accessible: `/api/v1/public/health`
3. Check backend logs for errors
4. Verify `VITE_API_BASE_URL` in built files (search `dist/assets/*.js` for "api/v1")

