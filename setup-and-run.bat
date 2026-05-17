@echo off
REM PAYO Complete Setup and Run Script for Windows
REM This script sets up and runs both backend and frontend

echo =========================================
echo PAYO Mobile App - Complete Setup
echo =========================================
echo.

REM Check prerequisites
echo Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js v18+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js installed: %NODE_VERSION%

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.11+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Python installed: %PYTHON_VERSION%

REM Check MongoDB
where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] MongoDB not found. Will try to start anyway...
) else (
    echo [OK] MongoDB installed
)

echo.
echo =========================================
echo Step 1: Backend Setup
echo =========================================

cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install Python dependencies
echo [INFO] Installing Python dependencies...
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo [OK] Python dependencies installed

REM Create .env if it doesn't exist
if not exist ".env" (
    echo [INFO] Creating .env file...
    (
        echo MONGO_URL=mongodb://localhost:27017
        echo DB_NAME=payo_dev
        echo SECRET_KEY=dev-secret-key-change-in-production
        echo ENVIRONMENT=development
    ) > .env
    echo [OK] .env file created
)

REM Start MongoDB if not running
echo [INFO] Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Starting MongoDB...
    net start MongoDB >nul 2>nul
    timeout /t 2 /nobreak >nul
)

REM Start backend server in background
echo [INFO] Starting backend server...
start /B python server.py
timeout /t 3 /nobreak >nul

REM Wait for backend to be ready
echo [INFO] Waiting for backend to be ready...
set /a count=0
:wait_backend
curl -s http://localhost:8001/health >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend is ready!
    goto backend_ready
)
set /a count+=1
if %count% GEQ 30 (
    echo [ERROR] Backend failed to start
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_backend

:backend_ready
cd ..

echo.
echo =========================================
echo Step 2: Frontend Setup
echo =========================================

cd frontend

REM Install Node dependencies
if not exist "node_modules" (
    echo [INFO] Installing Node dependencies (this may take a few minutes)...
    call npm install --silent
    echo [OK] Node dependencies installed
) else (
    echo [OK] Node dependencies already installed
)

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :got_ip
)
:got_ip
set LOCAL_IP=%LOCAL_IP:~1%

REM Create .env file
echo [INFO] Creating frontend .env file...
echo EXPO_PUBLIC_BACKEND_URL=http://%LOCAL_IP%:8001 > .env
echo [OK] Frontend .env created with backend URL: http://%LOCAL_IP%:8001

REM Fix missing splash icon
if not exist "assets\images\splash-icon.png" (
    echo [INFO] Creating splash icon...
    copy assets\images\icon.png assets\images\splash-icon.png >nul
    echo [OK] Splash icon created
)

echo.
echo =========================================
echo Step 3: Starting Mobile App
echo =========================================
echo.
echo [INFO] Starting Expo development server...
echo.
echo Choose how to run the app:
echo   1. Scan QR code with Expo Go app on your phone
echo   2. Press 'a' to open on Android emulator
echo   3. Press 'w' to open in web browser
echo.
echo Backend API: http://%LOCAL_IP%:8001
echo API Docs: http://%LOCAL_IP%:8001/docs
echo.

REM Start Expo
call npx expo start

cd ..

@REM Made with Bob
