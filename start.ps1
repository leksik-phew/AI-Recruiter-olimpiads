# Запуск AI-Рекрутера олимпиад
Write-Host "🚀 Запускаем AI-Рекрутер олимпиад..." -ForegroundColor Cyan

# Бэкенд
Write-Host "`n📦 Запуск бэкенда (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; pip install -r requirements.txt -q; python main.py"

Start-Sleep -Seconds 3

# Фронтенд
Write-Host "⚛️  Запуск фронтенда (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`n✅ Сервисы запускаются:" -ForegroundColor Green
Write-Host "   🌐 Фронтенд: http://localhost:5173" -ForegroundColor White
Write-Host "   🔧 API:      http://localhost:8000" -ForegroundColor White
Write-Host "   📖 Docs:     http://localhost:8000/docs" -ForegroundColor White
