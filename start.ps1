# Start dev mode in a single terminal
$root = $PSScriptRoot

Write-Host "Starting full dev environment..." -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor White
Write-Host "  API      : http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs : http://localhost:8000/docs" -ForegroundColor White
Write-Host ""

Set-Location $root
npm run dev
