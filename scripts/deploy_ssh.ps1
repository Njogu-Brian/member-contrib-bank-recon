# SSH Deployment Script
# Deploys code to production server via SSH

param(
    [Parameter(Mandatory=$true)]
    [string]$SSHHost,
    
    [Parameter(Mandatory=$false)]
    [string]$SSHUser,
    
    [Parameter(Mandatory=$false)]
    [string]$SSHKey,
    
    [Parameter(Mandatory=$false)]
    [int]$SSHPort = 22,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerPath = "/var/www/html",
    
    [Parameter(Mandatory=$false)]
    [string]$FrontendApiUrl = "/api/v1"
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SSH Production Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build SSH command
$sshCmd = "ssh"
if ($SSHPort -ne 22) {
    $sshCmd += " -p $SSHPort"
}
if ($SSHKey) {
    $sshCmd += " -i `"$SSHKey`""
}
if ($SSHUser) {
    $sshCmd += " ${SSHUser}@${SSHHost}"
} else {
    $sshCmd += " $SSHHost"
}

Write-Host "Connecting to server: $SSHHost" -ForegroundColor Yellow
Write-Host ""

# Step 1: Pull latest code
Write-Host "==> Step 1: Pulling latest code from Git" -ForegroundColor Cyan
$pullCmd = "${sshCmd} `"cd ${ServerPath} && git pull origin master`""
Invoke-Expression $pullCmd

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "ERROR: Git pull failed!" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Code pulled successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Backend Deployment
Write-Host "==> Step 2: Deploying Backend" -ForegroundColor Cyan
$backendDeployCmd = "${sshCmd} `"cd ${ServerPath}/backend && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan queue:restart`""
Invoke-Expression $backendDeployCmd

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "WARNING: Backend deployment may have issues. Check output above." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Backend deployed successfully" -ForegroundColor Green
}

Write-Host ""

# Step 3: Frontend Deployment
Write-Host "==> Step 3: Building Frontend" -ForegroundColor Cyan
$frontendBuildCmd = "${sshCmd} `"cd ${ServerPath}/frontend && export VITE_API_BASE_URL='${FrontendApiUrl}' && npm install && npm run build`""
Invoke-Expression $frontendBuildCmd

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "WARNING: Frontend build may have issues. Check output above." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Frontend built successfully" -ForegroundColor Green
}

Write-Host ""

# Step 4: Verify deployment
Write-Host "==> Step 4: Verifying Deployment" -ForegroundColor Cyan
$verifyCmd = "${sshCmd} `"cd ${ServerPath}/frontend && test -d dist && echo 'Frontend dist exists' || echo 'Frontend dist missing'`""
Invoke-Expression $verifyCmd

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify frontend/dist/ exists on server" -ForegroundColor White
Write-Host "  2. Copy frontend/dist/ contents to web root" -ForegroundColor White
Write-Host "  3. Test the application in browser" -ForegroundColor White
Write-Host "  4. Check browser console for errors" -ForegroundColor White
Write-Host ""


