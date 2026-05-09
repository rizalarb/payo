@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║        PAYO On-Device AI - Installation Script              ║
echo ║        STT (Speech-to-Text) + QR Engine                     ║
echo ║        100%% Offline - Zero Cloud                           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: ============================================================
:: CHECK NODE.JS VERSION
:: ============================================================
echo [1/5] Checking Node.js version...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js v20+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set "NODE_MAJOR=%%a"
    set "NODE_MAJOR=!NODE_MAJOR:v=!"
)

if !NODE_MAJOR! LSS 20 (
    echo [ERROR] Node.js version too old!
    echo Required: v20.0.0 or higher
    echo Current: 
    node -v
    echo.
    echo Please upgrade Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node -v
echo.

:: ============================================================
:: CHECK NPM
:: ============================================================
echo [2/5] Checking npm...
npm -v >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)
echo [OK] npm version:
npm -v
echo.

:: ============================================================
:: INSTALL DEPENDENCIES
:: ============================================================
echo [3/5] Installing npm dependencies...
echo This may take a few minutes...
echo.

cd /d "%~dp0"

call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo.
echo [OK] Dependencies installed successfully!
echo.

:: ============================================================
:: DOWNLOAD MODELS
:: ============================================================
echo [4/5] Downloading AI models (STT + QR)...
echo This will download approximately 75-250MB...
echo.

call node scripts/download-models.js
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Model download had issues. You can retry later with:
    echo   npm run download-models
    echo.
)

:: ============================================================
:: VERIFY SETUP
:: ============================================================
echo [5/5] Verifying setup...
echo.

call node scripts/verify-setup.js
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Verification found some issues.
    echo Please check the output above.
    echo.
)

:: ============================================================
:: DONE
:: ============================================================
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    INSTALLATION COMPLETE!                    ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  To start the server:                                        ║
echo ║    npm start                                                 ║
echo ║                                                              ║
echo ║  To run tests:                                               ║
echo ║    npm test                                                  ║
echo ║                                                              ║
echo ║  To re-download models:                                      ║
echo ║    npm run download-models                                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

pause
exit /b 0
