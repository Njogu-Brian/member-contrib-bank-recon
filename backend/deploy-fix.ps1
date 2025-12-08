# Production Deployment Fix Script for Windows
# Run this on your production server via PowerShell

Write-Host "=== Starting Deployment Fix ===" -ForegroundColor Green

# Pull latest code
Write-Host "1. Pulling latest code..." -ForegroundColor Yellow
git pull origin master

# Clear all caches
Write-Host "2. Clearing caches..." -ForegroundColor Yellow
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Rebuild caches
Write-Host "3. Rebuilding caches..." -ForegroundColor Yellow
php artisan route:cache
php artisan config:cache

# Check if migrations are needed
Write-Host "4. Checking migrations..." -ForegroundColor Yellow
php artisan migrate --force

# Verify routes
Write-Host "5. Verifying routes..." -ForegroundColor Yellow
php artisan route:list --path=admin/members | Select-Object -First 20
php artisan route:list --path=admin/pending-profile-changes | Select-Object -First 20

Write-Host "=== Deployment Fix Complete ===" -ForegroundColor Green
Write-Host "Please check the routes above to ensure they're registered correctly."
Write-Host "If errors persist, check: Get-Content storage/logs/laravel.log -Tail 50"

