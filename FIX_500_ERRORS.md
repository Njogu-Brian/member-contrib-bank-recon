# Fix 500 Internal Server Errors

## Problem:
Getting 500 errors on API endpoints:
- `/api/v1/admin/settings`
- `/api/v1/auth/me`
- `/api/v1/public/settings`
- `/api/v1/public/dashboard/snapshot`
- `/api/v1/public/announcements`

## Quick Fixes:

### Step 1: Check Laravel Logs

SSH into production and run:
```bash
cd ~/laravel-app/evimeria/backend
tail -100 storage/logs/laravel.log | grep -i "error\|exception" -A 10
```

Or use the check script:
```bash
php check_500_errors.php
```

### Step 2: Clear All Caches

```bash
cd ~/laravel-app/evimeria/backend
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear
```

### Step 3: Check File Permissions

Make sure Laravel can write to storage:
```bash
chmod -R 775 storage bootstrap/cache
chown -R royalce1:nobody storage bootstrap/cache
```

### Step 4: Verify Database Connection

Check if database is accessible:
```bash
php artisan tinker --execute="echo 'DB connected: ' . (DB::connection()->getPdo() ? 'YES' : 'NO');"
```

### Step 5: Check for Syntax Errors

Verify the updated files don't have syntax errors:
```bash
php -l app/Models/Member.php
php -l app/Http/Controllers/ProfileController.php
```

### Step 6: Check Error Log

Also check Apache/PHP error log:
```bash
tail -50 ~/error_log
# or
tail -50 ~/evimeria.breysomsolutions.co.ke/error_log
```

## Common Causes:

1. **Syntax Error in Updated Files**
   - Check Member.php and ProfileController.php for syntax errors
   - Make sure all brackets are closed

2. **Missing Database Columns**
   - If next_of_kin fields don't exist in database, queries will fail
   - Check: `DESCRIBE members;` should show next_of_kin columns

3. **Cache Issues**
   - Old cached config/routes might be causing issues
   - Clear all caches

4. **File Permissions**
   - Laravel needs write access to storage and cache directories

5. **PHP Version**
   - Make sure PHP version is compatible (should be 8.1+)

## Quick Diagnostic:

Run this to get a summary:
```bash
cd ~/laravel-app/evimeria/backend
php check_500_errors.php
```

This will show:
- Recent errors from logs
- Syntax check on updated files
- Help identify the root cause

