param(
    [string]$Env = "staging"
)

Write-Host "==> Deploying Laravel backend for $Env" -ForegroundColor Cyan

Push-Location "$PSScriptRoot/../backend"

php artisan down

composer install --no-dev --optimize-autoloader

php artisan migrate --force
php artisan db:seed --force

php artisan config:cache
php artisan route:cache
php artisan event:cache

php artisan queue:restart
php artisan up

Pop-Location

Write-Host "Backend deployment complete." -ForegroundColor Green

