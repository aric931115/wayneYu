<#
使用方法：
1. 雙擊 start-dev.ps1 啟動
2. 如果 PowerShell 阻止執行，可先在 PowerShell 中執行：
   Set-ExecutionPolicy -Scope Process RemoteSigned
3. 腳本會自動檢查 Node.js、npm，並安裝依賴套件
4. 啟動後請開啟瀏覽器到：http://localhost:8080/
5. 如需手動啟動，可輸入：npm ci 及 npm run dev
6. 按 Ctrl+C 可停止開發伺服器
#>

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Bridge Heart Connect - 開發伺服器啟動" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "使用說明：" -ForegroundColor Cyan
Write-Host "  1. 雙擊此檔案即可啟動開發伺服器" -ForegroundColor Cyan
Write-Host "  2. 啟動後請打開 http://localhost:8080/" -ForegroundColor Cyan
Write-Host "  3. 若需要手動啟動，請執行 npm ci 與 npm run dev" -ForegroundColor Cyan
Write-Host ""

# 檢查 Node.js
Write-Host "正在檢查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>$null
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 找不到 Node.js！請先安裝 Node.js" -ForegroundColor Red
    Write-Host "   下載網址: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按 Enter 鍵結束"
    exit 1
}

# 檢查 npm
Write-Host "正在檢查 npm..." -ForegroundColor Yellow
try {
    $npmVersion = & npm --version 2>$null
    Write-Host "✅ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 找不到 npm！請重新安裝 Node.js" -ForegroundColor Red
    Read-Host "按 Enter 鍵結束"
    exit 1
}

Write-Host ""
Write-Host "正在依 package-lock.json 安裝固定版本的依賴套件..." -ForegroundColor Yellow
& npm ci

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 安裝依賴失敗！" -ForegroundColor Red
    Read-Host "按 Enter 鍵結束"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🚀 啟動開發伺服器..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "應用程式將在以下網址開啟：" -ForegroundColor Green
Write-Host "  http://localhost:8080/" -ForegroundColor Green
Write-Host ""
Write-Host "按 Ctrl+C 可以停止伺服器" -ForegroundColor Yellow
Write-Host ""

& npm run dev

Read-Host "按 Enter 鍵結束"