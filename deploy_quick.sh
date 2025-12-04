#!/bin/bash

# Quick Deployment Script for Evimeria System
# Run on server: bash deploy_quick.sh

echo "🚀 Starting Evimeria System Deployment..."

# Navigate to project
cd ~/domains/evimeria.breysomsolutions.co.ke/public_html || exit 1

echo "📥 Pulling latest code from GitHub..."
git pull origin master

echo "📦 Updating backend dependencies..."
cd backend
composer install --optimize-autoloader --no-dev

echo "🗄️ Running migrations..."
php artisan migrate --force

echo "🧹 Clearing all caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize

echo "🗑️ Deleting documentation .md files..."
cd ..
find . -name "*.md" -type f ! -name "README.md" -delete
echo "Deleted all .md files (kept README.md)"

echo "🔧 Setting permissions..."
cd backend
chmod -R 775 storage bootstrap/cache

# Try to set ownership (non-interactive, skip if no sudo access)
if sudo -n true 2>/dev/null; then
    echo "Setting ownership with sudo..."
    sudo chown -R www-data:www-data storage bootstrap/cache
else
    echo "⚠️  Skipping ownership change (no sudo access or requires password)"
    echo "   Run manually if needed: sudo chown -R www-data:www-data storage bootstrap/cache"
fi

echo "✅ Backend deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Upload and extract dist.zip to public/ folder"
echo "2. Test the application"
echo "3. Run: php artisan invoices:backfill (first time only)"

cd ~/domains/evimeria.breysomsolutions.co.ke/public_html

