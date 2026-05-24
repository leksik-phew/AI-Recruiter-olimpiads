# Start AI-olimpiad-recruiter
$root     = $PSScriptRoot
$backend  = "$root\backend"
$frontend = "$root\frontend"

Write-Host "Starting AI-Recruiter..." -ForegroundColor Cyan

# Backend in a new PowerShell window
Write-Host "Starting backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$backend'; python main.py"
)

Start-Sleep -Seconds 3

# Frontend in a new PowerShell window
Write-Host "Starting frontend (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$frontend'; npm run dev"
)

Write-Host ""
Write-Host "Services starting:" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor White
Write-Host "  API      : http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs : http://localhost:8000/docs" -ForegroundColor White
