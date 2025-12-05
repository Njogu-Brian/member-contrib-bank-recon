#!/bin/bash
# Deployment script for Evimeria System

SSH_HOST="evimeria.breysomsolutions.co.ke"
SSH_USER="1980royalce1"
SERVER_PATH="/home/1980royalce1/laravel/evimeria"
PUBLIC_PATH="/home/1980royalce1/public_html/evimeria.breysomsolutions.co.ke"

echo "🚀 Starting Evimeria System Deployment..."
echo ""

# Step 1: Upload dist.zip
echo "📦 Step 1: Uploading dist.zip to server..."
if [ ! -f "frontend/dist.zip" ]; then
    echo "❌ ERROR: dist.zip not found at frontend/dist.zip"
    exit 1
fi

scp frontend/dist.zip "${SSH_USER}@${SSH_HOST}:${SERVER_PATH}/dist.zip"
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to upload dist.zip"
    exit 1
fi
echo "  ✓ dist.zip uploaded successfully"
echo ""

# Step 2: Deploy backend and extract frontend
echo "🔧 Step 2: Deploying backend and extracting frontend..."
ssh "${SSH_USER}@${SSH_HOST}" << 'ENDSSH'
cd /home/1980royalce1/laravel/evimeria
echo "📥 Pulling latest code from GitHub..."
git pull origin master
echo ""
echo "📦 Updating backend dependencies..."
cd backend
composer install --optimize-autoloader --no-dev
echo ""
echo "🗄️ Running migrations..."
php artisan migrate --force
echo ""
echo "🧹 Clearing all caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
echo ""
echo "📁 Extracting frontend dist.zip..."
cd ..
if [ -f dist.zip ]; then
    unzip -o dist.zip -d dist_temp
    if [ -d dist_temp/dist ]; then
        rm -rf /home/1980royalce1/public_html/evimeria.breysomsolutions.co.ke/*
        cp -r dist_temp/dist/* /home/1980royalce1/public_html/evimeria.breysomsolutions.co.ke/
        rm -rf dist_temp
        rm -f dist.zip
        echo "  ✓ Frontend extracted to public_html"
    else
        echo "  ⚠ WARNING: dist folder not found in zip"
    fi
else
    echo "  ⚠ WARNING: dist.zip not found on server"
fi
echo ""
echo "🔧 Setting permissions..."
cd backend
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || chown -R $USER:$USER storage bootstrap/cache
echo ""
echo "✅ Deployment complete!"
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Test the application at https://evimeria.breysomsolutions.co.ke"
    echo "  2. Check browser console for any errors"
    echo "  3. Verify Statement Audit feature works"
    echo ""
else
    echo ""
    echo "❌ Deployment failed! Check the errors above."
    exit 1
fi

