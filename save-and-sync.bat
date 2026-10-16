@echo off
setlocal
cd /d "%~dp0"

where powershell.exe >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 找不到 Windows PowerShell。
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0save-and-sync.ps1"
if errorlevel 1 (
    echo.
    echo [ERROR] 同步失敗，請查看上方訊息。
    pause
    exit /b 1
)

echo.
pause
