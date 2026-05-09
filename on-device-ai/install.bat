@echo off
chcp 65001 >nul
REM ============================================================
REM PAYO On-Device AI - Windows Batch Installer
REM Compatible with: Windows 10, Windows 11
REM ============================================================

echo.
echo ========================================================
echo   PAYO On-Device AI - Windows Installer
echo   STT (Speech-to-Text) + QR Engine
echo   100%% Offline Processing
echo ========================================================
echo.

REM Check if running as admin (optional)
REM net session >nul 2>&1
REM if %errorLevel% neq 0 (
REM     echo [WARNING] Not running as Administrator
REM )

REM ============================================================
REM STEP 1: Verify Node.js
REM ============================================================
echo [STEP 1/5] Checking Node.js installation...

node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH!
    echo.
    echo Please download and install Node.js v20+ from:
    echo   https://nodejs.org/en/download/
    echo.
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Extract major version number
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:~1%

if %NODE_MAJOR% LSS 20 (
    echo.
    echo [ERROR] Node.js version %NODE_VERSION% is too old!
    echo [ERROR] PAYO requires Node.js v20.0.0 or higher.
    echo.
    echo Please upgrade from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.

REM ============================================================
REM STEP 2: Verify npm
REM ============================================================
echo [STEP 2/5] Checking npm...

npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not available!
    pause
    exit /b 1
)

for /f "delims=" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: v%NPM_VERSION%
echo.

REM ============================================================
REM STEP 3: Change to script directory
REM ============================================================
echo [STEP 3/5] Setting up project directory...

cd /d "%~dp0"
echo [OK] Working directory: %CD%
echo.

REM ============================================================
REM STEP 4: Install npm packages
REM ============================================================
echo [STEP 4/5] Installing npm packages...
echo This may take 2-5 minutes depending on your connection.
echo.

call npm install --prefer-offline
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [OK] npm packages installed successfully!
echo.

REM ============================================================
REM STEP 5: Download AI Models
REM ============================================================
echo [STEP 5/5] Downloading AI models for offline use...
echo.
echo Models to download:
echo   - Whisper Tiny (STT) : ~75MB
echo   - QR Assets          : ~1MB
echo.

call node scripts/download-models.js
if errorlevel 1 (
    echo.
    echo [WARNING] Some models failed to download.
    echo You can retry with: npm run download-models
    echo.
)

REM ============================================================
REM VERIFICATION
REM ============================================================
echo.
echo ========================================================
echo   Verifying Installation...
echo ========================================================
echo.

call node scripts/verify-setup.js

REM ============================================================
REM SUCCESS
REM ============================================================
echo.
echo ========================================================
echo   INSTALLATION COMPLETE!
echo ========================================================
echo.
echo   Quick Commands:
echo   ---------------
echo   Start Server    : npm start
echo   Run Tests       : npm test
echo   Download Models : npm run download-models
echo.
echo   For more info, see README.md
echo.
echo ========================================================
echo.

pause
exit /b 0
