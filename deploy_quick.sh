#!/bin/bash

# Quick Deployment Script for Evimeria System
# Usage: cd /path/to/project && bash deploy_quick.sh

echo "🚀 Starting Evimeria System Deployment..."

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "📁 Working directory: $(pwd)"

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
sudo chown -R www-data:www-data storage bootstrap/cache

echo "✅ Backend deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Upload and extract dist.zip to public/ folder"
echo "2. Test the application"
echo "3. Run: php artisan invoices:backfill (first time only)"
echo ""
echo "📁 Current directory: $(pwd)"
