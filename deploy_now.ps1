# PowerShell Deployment Script for Evimeria System
# Deploys backend and frontend to production server

$SSH_HOST = "evimeria.breysomsolutions.co.ke"
$SSH_USER = "1980royalce1"
$SERVER_PATH = "/home/1980royalce1/laravel/evimeria"
$PUBLIC_PATH = "/home/1980royalce1/public_html/evimeria.breysomsolutions.co.ke"

Write-Host "🚀 Starting Evimeria System Deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload dist.zip
Write-Host "📦 Step 1: Uploading dist.zip to server..." -ForegroundColor Yellow
$distZipPath = Join-Path $PSScriptRoot "frontend\dist.zip"
if (-not (Test-Path $distZipPath)) {
    Write-Host "❌ ERROR: dist.zip not found at $distZipPath" -ForegroundColor Red
    exit 1
}

scp $distZipPath "${SSH_USER}@${SSH_HOST}:${SERVER_PATH}/dist.zip"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to upload dist.zip" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ dist.zip uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy backend and extract frontend
Write-Host "🔧 Step 2: Deploying backend and extracting frontend..." -ForegroundColor Yellow
$deployCommands = @'
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
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || chown -R `$USER:`$USER storage bootstrap/cache
echo ""
echo "✅ Deployment complete!"
'@

$sshTarget = "${SSH_USER}@${SSH_HOST}"
ssh $sshTarget $deployCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Test the application at https://evimeria.breysomsolutions.co.ke"
    Write-Host "  2. Check browser console for any errors"
    Write-Host "  3. Verify Statement Audit feature works"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed! Check the errors above." -ForegroundColor Red
    exit 1
}

