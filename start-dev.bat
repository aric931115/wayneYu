@echo off
REM 使用方法：
REM 1. 雙擊 start-dev.bat 即可啟動開發伺服器
REM 2. 啟動後請開啟瀏覽器到：http://localhost:8080/
REM 3. 如需手動啟動，可執行：npm ci 及 npm run dev
REM 4. 按 Ctrl+C 可停止開發伺服器

echo ========================================
echo    Bridge Heart Connect - Dev Server
echo ========================================
echo.
echo 使用說明：
echo   1. 雙擊此檔案即可啟動開發伺服器
echo   2. 啟動後請打開 http://localhost:8080/
echo   3. 若需要手動啟動，請執行 npm ci 與 npm run dev
echo.

cd /d "%~dp0"

REM Add Node.js to PATH if not already there
set "NODE_PATH=C:\Program Files\nodejs"
if exist "%NODE_PATH%\node.exe" (
    set "PATH=%NODE_PATH%;%PATH%"
)

echo Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js first
    echo Download: https://nodejs.org/
    echo Make sure Node.js is in your PATH
    pause
    exit /b 1
)

echo Checking npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm not found! Please reinstall Node.js
    pause
    exit /b 1
)

echo.
echo Installing exact dependencies from package-lock.json...
call npm ci

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo ========================================
echo         Starting Dev Server...
echo ========================================
echo.
echo App will be available at:
echo   http://localhost:8080/
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause