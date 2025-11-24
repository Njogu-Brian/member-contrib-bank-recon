Write-Host "==> Building Flutter web and Android artifacts" -ForegroundColor Cyan

Push-Location "$PSScriptRoot/../evimeria_app"

flutter pub get
flutter analyze
flutter test
flutter build web --no-wasm-dry-run
flutter build apk --release

Pop-Location

Write-Host "Artifacts ready under evimeria_app/build." -ForegroundColor Green

