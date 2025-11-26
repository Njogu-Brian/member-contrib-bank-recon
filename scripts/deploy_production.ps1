# Complete Production Deployment Script
# Deploys both backend and React frontend
# Compatible with PowerShell 5.1

param(
    [string]$Env = "production",
    [string]$FrontendApiUrl = "/api/v1"
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Production Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. BACKEND DEPLOYMENT
Write-Host "==> Step 1: Backend Deployment" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "..\backend"
Push-Location $backendPath

Write-Host "  Putting application in maintenance mode..." -ForegroundColor Yellow
php artisan down 2>$null

Write-Host "  Installing/updating dependencies..." -ForegroundColor Yellow
composer install --no-dev --optimize-autoloader
if ($?) {
    Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Composer install failed!" -ForegroundColor Red
    php artisan up
    Pop-Location
    exit 1
}

Write-Host "  Running database migrations..." -ForegroundColor Yellow
php artisan migrate --force

Write-Host "  Clearing old caches..." -ForegroundColor Yellow
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

Write-Host "  Caching configuration..." -ForegroundColor Yellow
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

Write-Host "  Restarting queue workers..." -ForegroundColor Yellow
php artisan queue:restart

Write-Host "  Bringing application back online..." -ForegroundColor Yellow
php artisan up

Pop-Location

Write-Host "  [OK] Backend deployment complete!" -ForegroundColor Green
Write-Host ""

# 2. FRONTEND DEPLOYMENT
Write-Host "==> Step 2: Frontend Deployment" -ForegroundColor Cyan
Write-Host ""

$frontendPath = Join-Path $PSScriptRoot "..\frontend"
Push-Location $frontendPath

# Set environment variable for build
$env:VITE_API_BASE_URL = $FrontendApiUrl

Write-Host "  Using API Base URL: $FrontendApiUrl" -ForegroundColor Yellow

Write-Host "  Installing/updating dependencies..." -ForegroundColor Yellow
npm install
if ($?) {
    Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "  Building frontend for production..." -ForegroundColor Yellow
npm run build
if ($?) {
    Write-Host "  [OK] Build completed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Verify build output
$distPath = Join-Path $frontendPath "dist"
if (Test-Path $distPath) {
    $files = Get-ChildItem -Path $distPath -Recurse -File
    $fileCount = ($files | Measure-Object).Count
    $buildSize = ($files | Measure-Object -Property Length -Sum).Sum / 1MB
    $buildSizeRounded = [math]::Round($buildSize, 2)
    
    Write-Host "  [OK] Build complete! ($fileCount files, $buildSizeRounded MB)" -ForegroundColor Green
} else {
    Write-Host "ERROR: Build output directory not found!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Copy contents of 'frontend/dist/' to your production web server" -ForegroundColor White
Write-Host "  2. Ensure server is configured for React Router (all routes to index.html)" -ForegroundColor White
Write-Host "  3. Verify API endpoints are accessible at $FrontendApiUrl" -ForegroundColor White
Write-Host "  4. Test the application and check browser console for errors" -ForegroundColor White
Write-Host "  5. Clear browser cache (Ctrl+Shift+R) and verify all features work" -ForegroundColor White
Write-Host ""
Write-Host "Build location: frontend/dist/" -ForegroundColor Cyan
Write-Host ""
