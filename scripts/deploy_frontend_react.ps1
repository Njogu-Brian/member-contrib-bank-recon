# Deploy React Frontend for Production
# This script builds the React frontend and prepares it for deployment

param(
    [string]$Env = "production",
    [string]$ApiBaseUrl = "/api/v1",
    [string]$OutputDir = "dist"
)

Write-Host "==> Building React Frontend for $Env" -ForegroundColor Cyan

Push-Location "$PSScriptRoot/../frontend"

# Set environment variable for build
$env:VITE_API_BASE_URL = $ApiBaseUrl

Write-Host "  Using API Base URL: $ApiBaseUrl" -ForegroundColor Yellow

# Check if node_modules exists, if not install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "  Checking for updated dependencies..." -ForegroundColor Yellow
    npm install
}

# Build for production
Write-Host "  Building frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Verify build output
if (Test-Path $OutputDir) {
    $fileCount = (Get-ChildItem -Path $OutputDir -Recurse -File | Measure-Object).Count
    Write-Host "  Build complete! Generated $fileCount files in $OutputDir/" -ForegroundColor Green
    
    # Show build size
    $buildSize = (Get-ChildItem -Path $OutputDir -Recurse -File | 
        Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: Build output directory not found!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host "`n==> Frontend build ready for deployment" -ForegroundColor Green
Write-Host "  Build location: frontend/$OutputDir/" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Copy contents of 'frontend/$OutputDir/' to your production web server" -ForegroundColor White
Write-Host "  2. Ensure your server is configured to serve index.html for all routes (React Router)" -ForegroundColor White
Write-Host "  3. Verify VITE_API_BASE_URL matches your production API base URL" -ForegroundColor White
Write-Host "  4. Clear browser cache and test the application" -ForegroundColor White

