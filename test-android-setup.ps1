# Android App Setup Verification Script
# This script verifies all dependencies and services are ready for Android app testing

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Android App Setup Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Check Flutter Installation
Write-Host "1. Checking Flutter..." -ForegroundColor Yellow
try {
    $flutterVersion = flutter --version 2>&1 | Select-String "Flutter" | Select-Object -First 1
    Write-Host "   [✓] Flutter installed: $flutterVersion" -ForegroundColor Green
} catch {
    Write-Host "   [✗] Flutter not found!" -ForegroundColor Red
    $allGood = $false
}

# 2. Check Flutter Dependencies
Write-Host "2. Checking Flutter dependencies..." -ForegroundColor Yellow
if (Test-Path "evimeria_app\env\.env") {
    Write-Host "   [✓] Mobile app .env file exists" -ForegroundColor Green
    $envContent = Get-Content "evimeria_app\env\.env"
    if ($envContent -match "API_BASE_URL") {
        Write-Host "   [✓] API_BASE_URL configured" -ForegroundColor Green
    } else {
        Write-Host "   [✗] API_BASE_URL not found in .env" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   [✗] Mobile app .env file not found!" -ForegroundColor Red
    $allGood = $false
}

# 3. Check Backend Services
Write-Host "3. Checking backend services..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/public/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [✓] Backend API is running on port 8000" -ForegroundColor Green
} catch {
    Write-Host "   [!] Backend API is not running (this is OK if you haven't started it yet)" -ForegroundColor Yellow
    Write-Host "      Start backend with: cd backend; php artisan serve" -ForegroundColor Gray
}

# 4. Check PHP
Write-Host "4. Checking PHP..." -ForegroundColor Yellow
try {
    $phpVersion = php -r "echo PHP_VERSION;" 2>&1
    Write-Host "   [✓] PHP installed: $phpVersion" -ForegroundColor Green
} catch {
    Write-Host "   [✗] PHP not found!" -ForegroundColor Red
    $allGood = $false
}

# 5. Check Laravel
Write-Host "5. Checking Laravel..." -ForegroundColor Yellow
if (Test-Path "backend\artisan") {
    try {
        $laravelVersion = cd backend; php artisan --version 2>&1 | Select-String "Laravel" | Select-Object -First 1
        Write-Host "   [✓] Laravel installed: $laravelVersion" -ForegroundColor Green
        Set-Location ..
    } catch {
        Write-Host "   [✗] Laravel not working properly" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   [✗] Laravel backend not found!" -ForegroundColor Red
    $allGood = $false
}

# 6. Check Android Emulators
Write-Host "6. Checking Android emulators..." -ForegroundColor Yellow
$emulators = flutter emulators 2>&1
if ($emulators -match "available") {
    Write-Host "   [!] No emulators found. You can:" -ForegroundColor Yellow
    Write-Host "      - Create one: flutter emulators --create" -ForegroundColor Gray
    Write-Host "      - Use Android Studio to create an AVD" -ForegroundColor Gray
    Write-Host "      - Connect a physical Android device" -ForegroundColor Gray
} else {
    Write-Host "   [✓] Android emulators available" -ForegroundColor Green
}

# 7. Check Flutter packages
Write-Host "7. Checking Flutter packages..." -ForegroundColor Yellow
if (Test-Path "evimeria_app\pubspec.lock") {
    Write-Host "   [✓] Flutter packages installed" -ForegroundColor Green
} else {
    Write-Host "   [!] Flutter packages not installed. Run: cd evimeria_app; flutter pub get" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "[✓] All critical dependencies are installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Start backend: cd backend; php artisan serve" -ForegroundColor White
    Write-Host "2. Start queue worker: cd backend; php artisan queue:work" -ForegroundColor White
    Write-Host "3. Create/start Android emulator or connect device" -ForegroundColor White
    Write-Host "4. Run app: cd evimeria_app; flutter run" -ForegroundColor White
} else {
    Write-Host "[✗] Some dependencies are missing. Please fix the errors above." -ForegroundColor Red
}

Write-Host ""


