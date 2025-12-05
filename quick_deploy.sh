#!/bin/bash
# Quick deployment script to run on server after SSH connection

cd /home/1980royalce1/laravel-app/evimeria

echo "📥 Pulling latest code..."
git pull origin master

echo "📦 Updating backend dependencies..."
cd backend
composer install --optimize-autoloader --no-dev

echo "🗄️ Running migrations (update only)..."
php artisan migrate --force

echo "🧹 Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize

echo "📁 Extracting frontend..."
cd ..
if [ -f dist.zip ]; then
    unzip -o dist.zip -d dist_temp
    if [ -d dist_temp/dist ]; then
        PUBLIC_DIR="/home/1980royalce1/public_html/evimeria.breysomsolutions.co.ke"
        rm -rf $PUBLIC_DIR/*
        cp -r dist_temp/dist/* $PUBLIC_DIR/
        rm -rf dist_temp
        rm -f dist.zip
        echo "  ✓ Frontend deployed"
    fi
fi

echo "🔧 Setting permissions..."
cd backend
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || chown -R $USER:$USER storage bootstrap/cache

echo "💰 Generating invoices..."
echo "  Weekly invoices..."
php artisan invoices:backfill --no-interaction

echo "  Registration fees..."
php artisan invoices:generate-registration-fees --no-interaction

echo "  Annual subscriptions..."
php artisan invoices:generate-annual-subscriptions --no-interaction

echo "  Software acquisition..."
php artisan invoices:generate-software-acquisition --no-interaction

echo ""
echo "✅ Deployment complete!"


