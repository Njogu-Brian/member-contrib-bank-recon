# Deployment Instructions for Profile Completion Changes

## Changes Made:
1. **Backend**: Made next of kin fields mandatory in Member model and ProfileController
2. **Frontend**: Updated ProfileUpdateModal to require next of kin fields

## Steps to Deploy:

### 1. Update Backend Files on Production

SSH into production and run:

```bash
cd ~/laravel-app/evimeria/backend

# Backup files first
cp app/Models/Member.php app/Models/Member.php.backup
cp app/Http/Controllers/ProfileController.php app/Http/Controllers/ProfileController.php.backup

# Run update scripts
php update_production_member.php
php update_production_profile_controller.php

# Clear caches
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```

### 2. Build Frontend

On your local machine:

```bash
cd frontend
npm install  # if needed
npm run build
```

### 3. Upload Frontend Dist to Production

After building, upload the `frontend/dist` folder to production:

```bash
# From local machine, upload dist folder
scp -P 1980 -r frontend/dist/* royalce1@breysomsolutions.co.ke:~/evimeria.breysomsolutions.co.ke/
```

Or manually:
- Copy all files from `frontend/dist/` 
- Upload to `~/evimeria.breysomsolutions.co.ke/` on production

### 4. Verify Changes

1. Check that Member model has next_of_kin fields in `isProfileComplete()`
2. Check that ProfileController requires next_of_kin fields
3. Test profile update form - next of kin fields should be required
4. Test statement viewing - should require complete profile

## Files Changed:
- `backend/app/Models/Member.php`
- `backend/app/Http/Controllers/ProfileController.php`
- `frontend/src/components/ProfileUpdateModal.jsx` (needs dist build)

