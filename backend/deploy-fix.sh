#!/bin/bash

# Production Deployment Fix Script
# Run this on your production server

echo "=== Starting Deployment Fix ==="

# Pull latest code
echo "1. Pulling latest code..."
git pull origin master

# Clear all caches
echo "2. Clearing caches..."
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Rebuild caches
echo "3. Rebuilding caches..."
php artisan route:cache
php artisan config:cache

# Check if migrations are needed
echo "4. Checking migrations..."
php artisan migrate --force

# Verify routes
echo "5. Verifying routes..."
php artisan route:list --path=admin/members | head -20
php artisan route:list --path=admin/pending-profile-changes | head -20

echo "=== Deployment Fix Complete ==="
echo "Please check the routes above to ensure they're registered correctly."
echo "If errors persist, check: tail -f storage/logs/laravel.log"

