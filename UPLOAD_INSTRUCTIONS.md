# Upload Instructions for Production Deployment

## Files Created:
1. **backend_updates.zip** - Contains updated backend files
2. **frontend_dist.zip** - Contains frontend build files

## Upload Steps:

### 1. Backend Files Upload

1. Extract `backend_updates.zip` on your local machine
2. Upload the following files to production via cPanel File Manager:
   - `app/Models/Member.php` → `~/laravel-app/evimeria/backend/app/Models/Member.php`
   - `app/Http/Controllers/ProfileController.php` → `~/laravel-app/evimeria/backend/app/Http/Controllers/ProfileController.php`
   - `deploy_to_production.php` → `~/laravel-app/evimeria/backend/deploy_to_production.php` (optional, for verification)

3. After uploading, SSH into production and run:
   ```bash
   cd ~/laravel-app/evimeria/backend
   php artisan config:clear
   php artisan route:clear
   php artisan cache:clear
   ```

### 2. Frontend Files Upload

1. Extract `frontend_dist.zip` on your local machine
2. Upload ALL extracted files to production via cPanel File Manager:
   - Upload to: `~/evimeria.breysomsolutions.co.ke/` (root directory)
   - Files to upload:
     - `index.html` → root directory
     - `.htaccess` → root directory (if it doesn't exist or needs updating)
     - `assets/` folder → root directory (contains all CSS and JS files)

3. **Important**: 
   - Upload files directly to the root of `evimeria.breysomsolutions.co.ke/`
   - Do NOT create a `dist` subfolder - files should be in the root
   - Replace existing files if prompted

### 3. Verify Deployment

1. Clear browser cache and visit: `https://evimeria.breysomsolutions.co.ke/login`
2. Check browser console for any errors
3. Test profile update form - next of kin fields should be required
4. Test statement viewing - should require complete profile

## Troubleshooting:

If you see MIME type errors in the browser console:
- Make sure `.htaccess` file exists in the root directory
- Check that files in `assets/` folder have correct permissions (644)
- Verify that `index.html` is in the root directory

## Files Changed:
- ✅ `backend/app/Models/Member.php` - Added next of kin to profile completion check
- ✅ `backend/app/Http/Controllers/ProfileController.php` - Made next of kin fields required
- ✅ `frontend/dist/` - Updated frontend build with required next of kin fields

