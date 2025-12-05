#!/bin/bash
# Production Deployment Script for Evimeria System

echo "🚀 Starting Production Deployment..."
echo ""

# Navigate to backend directory
cd /home/1980royalce1/laravel-app/evimeria || exit 1

echo "📥 Step 1: Pulling latest code from GitHub..."
git pull origin master
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Git pull failed!"
    exit 1
fi
echo "  ✓ Code pulled successfully"
echo ""

echo "📦 Step 2: Updating backend dependencies..."
cd backend
composer install --optimize-autoloader --no-dev
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Composer install failed!"
    exit 1
fi
echo "  ✓ Composer dependencies updated"
echo ""

echo "🗄️ Step 3: Running migrations (update only, not fresh)..."
php artisan migrate --force
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Migrations failed!"
    exit 1
fi
echo "  ✓ Migrations completed"
echo ""

echo "🧹 Step 4: Clearing all caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
echo "  ✓ Caches cleared and optimized"
echo ""

echo "📁 Step 5: Extracting frontend dist.zip..."
cd ..
if [ -f dist.zip ]; then
    unzip -o dist.zip -d dist_temp
    if [ -d dist_temp/dist ]; then
        PUBLIC_DIR="/home/1980royalce1/public_html/evimeria.breysomsolutions.co.ke"
        echo "  Copying files to $PUBLIC_DIR..."
        rm -rf $PUBLIC_DIR/*
        cp -r dist_temp/dist/* $PUBLIC_DIR/
        rm -rf dist_temp
        rm -f dist.zip
        echo "  ✓ Frontend extracted to public_html"
    else
        echo "  ⚠ WARNING: dist folder not found in zip"
    fi
else
    echo "  ⚠ WARNING: dist.zip not found on server (will need to upload manually)"
fi
echo ""

echo "🔧 Step 6: Setting permissions..."
cd backend
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || chown -R $USER:$USER storage bootstrap/cache
echo "  ✓ Permissions set"
echo ""

echo "💰 Step 7: Generating invoices..."
echo "  Generating weekly invoices from contribution start date..."
php artisan invoices:backfill --no-interaction
echo ""

echo "  Generating registration fees (date = first contribution)..."
php artisan invoices:generate-registration-fees --no-interaction
echo ""

echo "  Generating annual subscriptions (Jan 1, 2025 for 2024 members)..."
php artisan invoices:generate-annual-subscriptions --no-interaction
echo ""

echo "  Generating software acquisition fees (April 22, 2025 for all members)..."
php artisan invoices:generate-software-acquisition --no-interaction
echo ""

echo "✅ Deployment complete!"
echo ""
echo "📋 Summary:"
echo "  - Code updated from GitHub"
echo "  - Dependencies updated"
echo "  - Migrations run"
echo "  - Caches cleared"
echo "  - Frontend deployed (if dist.zip was present)"
echo "  - Invoices generated"
echo ""


