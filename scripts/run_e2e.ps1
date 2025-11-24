Write-Host "==> Running end-to-end health checks" -ForegroundColor Cyan

$apiUrl = "http://127.0.0.1:8000/api/health"
try {
    $response = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "API Health: $($response.StatusCode) $($response.StatusDescription)"
} catch {
    Write-Warning "API health check failed: $_"
}

Push-Location "$PSScriptRoot/../backend"
php artisan test
Pop-Location

Push-Location "$PSScriptRoot/../evimeria_app"
flutter test
Pop-Location

Write-Host "E2E checks finished." -ForegroundColor Green

