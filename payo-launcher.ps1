# PAYO Mobile App - Advanced PowerShell Launcher
# Production-ready automation script for Windows
# Version: 2.0.0

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('setup', 'start', 'android', 'ios', 'web', 'build', 'clean', 'status', 'help')]
    [string]$Action = 'help',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipChecks,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$FRONTEND_DIR = Join-Path $SCRIPT_DIR "frontend"
$LOG_FILE = Join-Path $SCRIPT_DIR "payo-launcher.log"

# Color output functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error-Custom { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning-Custom { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Step { param($Message) Write-Host "`n═══ $Message ═══" -ForegroundColor Magenta }

# Logging function
function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $logMessage
    if ($Verbose) { Write-Host $logMessage -ForegroundColor Gray }
}

# Banner
function Show-Banner {
    Clear-Host
    Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗  █████╗ ██╗   ██╗ ██████╗                     ║
║   ██╔══██╗██╔══██╗╚██╗ ██╔╝██╔═══██╗                    ║
║   ██████╔╝███████║ ╚████╔╝ ██║   ██║                    ║
║   ██╔═══╝ ██╔══██║  ╚██╔╝  ██║   ██║                    ║
║   ██║     ██║  ██║   ██║   ╚██████╔╝                    ║
║   ╚═╝     ╚═╝  ╚═╝   ╚═╝    ╚═════╝                     ║
║                                                           ║
║   Mobile Payment System - Advanced Launcher v2.0         ║
║   Tether-based POS for Indonesian Merchants              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
    Write-Host ""
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Pre-flight checks
function Test-Prerequisites {
    Write-Step "Running Pre-flight Checks"
    $allGood = $true
    
    # Check Node.js
    Write-Info "Checking Node.js..."
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Success "Node.js installed: $nodeVersion"
            Write-Log "Node.js version: $nodeVersion"
        } else {
            throw "Node.js not found"
        }
    } catch {
        Write-Error-Custom "Node.js not found. Please install Node.js v18+ from https://nodejs.org"
        $allGood = $false
    }
    
    # Check npm
    Write-Info "Checking npm..."
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            Write-Success "npm installed: v$npmVersion"
            Write-Log "npm version: $npmVersion"
        }
    } catch {
        Write-Error-Custom "npm not found"
        $allGood = $false
    }
    
    # Check Python
    Write-Info "Checking Python..."
    try {
        $pythonVersion = python --version 2>$null
        if ($pythonVersion) {
            Write-Success "Python installed: $pythonVersion"
            Write-Log "Python version: $pythonVersion"
        } else {
            throw "Python not found"
        }
    } catch {
        Write-Error-Custom "Python not found. Please install Python 3.11+ from https://python.org"
        $allGood = $false
    }
    
    # Check Java (for Android)
    Write-Info "Checking Java JDK..."
    try {
        $javaVersion = java -version 2>&1 | Select-String "version"
        if ($javaVersion) {
            Write-Success "Java JDK installed: $javaVersion"
            Write-Log "Java version: $javaVersion"
        }
    } catch {
        Write-Warning-Custom "Java JDK not found (required for Android builds)"
    }
    
    # Check Android SDK
    Write-Info "Checking Android SDK..."
    $androidHome = $env:ANDROID_HOME
    if ($androidHome -and (Test-Path $androidHome)) {
        Write-Success "Android SDK found: $androidHome"
        Write-Log "Android SDK: $androidHome"
    } else {
        Write-Warning-Custom "Android SDK not found (required for Android emulator)"
    }
    
    # Check MongoDB
    Write-Info "Checking MongoDB..."
    try {
        $mongoVersion = mongod --version 2>$null | Select-String "version"
        if ($mongoVersion) {
            Write-Success "MongoDB installed"
            Write-Log "MongoDB found"
        }
    } catch {
        Write-Warning-Custom "MongoDB not found. Install from https://mongodb.com"
    }
    
    # Check Expo CLI
    Write-Info "Checking Expo CLI..."
    try {
        $expoVersion = npx expo --version 2>$null
        if ($expoVersion) {
            Write-Success "Expo CLI available: v$expoVersion"
            Write-Log "Expo CLI version: $expoVersion"
        }
    } catch {
        Write-Warning-Custom "Expo CLI not found (will be installed)"
    }
    
    return $allGood
}

# Check port availability
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -eq $connection
}

# Find available port
function Get-AvailablePort {
    param([int]$StartPort = 8001)
    $port = $StartPort
    while (-not (Test-Port $port)) {
        $port++
        if ($port -gt ($StartPort + 100)) {
            throw "No available ports found in range $StartPort-$($StartPort+100)"
        }
    }
    return $port
}

# Get local IP address
function Get-LocalIP {
    $ip = Get-NetIPAddress -AddressFamily IPv4 | 
          Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } |
          Select-Object -First 1 -ExpandProperty IPAddress
    return $ip
}

# Setup backend
function Install-Backend {
    Write-Step "Setting Up Backend"
    
    Push-Location $BACKEND_DIR
    try {
        # Create virtual environment
        if (-not (Test-Path "venv")) {
            Write-Info "Creating Python virtual environment..."
            python -m venv venv
            Write-Success "Virtual environment created"
        }
        
        # Activate virtual environment
        Write-Info "Activating virtual environment..."
        & ".\venv\Scripts\Activate.ps1"
        
        # Upgrade pip
        Write-Info "Upgrading pip..."
        python -m pip install --upgrade pip --quiet
        
        # Install dependencies
        Write-Info "Installing Python dependencies..."
        pip install -r requirements.txt --quiet
        Write-Success "Backend dependencies installed"
        
        # Create .env if not exists
        if (-not (Test-Path ".env")) {
            Write-Info "Creating backend .env file..."
            @"
MONGO_URL=mongodb://localhost:27017
DB_NAME=payo_dev
SECRET_KEY=dev-secret-key-change-in-production
ENVIRONMENT=development
LOG_LEVEL=INFO
"@ | Out-File -FilePath ".env" -Encoding UTF8
            Write-Success "Backend .env created"
        }
        
        Write-Success "Backend setup complete"
    } catch {
        Write-Error-Custom "Backend setup failed: $_"
        Write-Log "Backend setup error: $_" "ERROR"
        throw
    } finally {
        Pop-Location
    }
}

# Setup frontend
function Install-Frontend {
    Write-Step "Setting Up Frontend"
    
    Push-Location $FRONTEND_DIR
    try {
        # Install dependencies
        if (-not (Test-Path "node_modules")) {
            Write-Info "Installing Node dependencies (this may take a few minutes)..."
            npm install --silent
            Write-Success "Frontend dependencies installed"
        } else {
            Write-Success "Frontend dependencies already installed"
        }
        
        # Get local IP
        $localIP = Get-LocalIP
        $backendPort = 8001
        
        # Create .env
        Write-Info "Creating frontend .env file..."
        "EXPO_PUBLIC_BACKEND_URL=http://${localIP}:${backendPort}" | Out-File -FilePath ".env" -Encoding UTF8
        Write-Success "Frontend .env created (Backend: http://${localIP}:${backendPort})"
        
        # Fix missing splash icon
        $iconPath = "assets\images\icon.png"
        $splashPath = "assets\images\splash-icon.png"
        if ((Test-Path $iconPath) -and -not (Test-Path $splashPath)) {
            Write-Info "Creating splash icon..."
            Copy-Item $iconPath $splashPath
            Write-Success "Splash icon created"
        }
        
        Write-Success "Frontend setup complete"
    } catch {
        Write-Error-Custom "Frontend setup failed: $_"
        Write-Log "Frontend setup error: $_" "ERROR"
        throw
    } finally {
        Pop-Location
    }
}

# Start MongoDB
function Start-MongoDB {
    Write-Info "Starting MongoDB..."
    
    # Check if MongoDB service exists
    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($mongoService) {
        if ($mongoService.Status -ne "Running") {
            Start-Service -Name "MongoDB"
            Start-Sleep -Seconds 2
            Write-Success "MongoDB service started"
        } else {
            Write-Success "MongoDB already running"
        }
    } else {
        Write-Warning-Custom "MongoDB service not found. Please start MongoDB manually."
    }
}

# Start backend server
function Start-Backend {
    Write-Step "Starting Backend Server"
    
    Push-Location $BACKEND_DIR
    try {
        # Activate virtual environment
        & ".\venv\Scripts\Activate.ps1"
        
        # Check port
        $port = 8001
        if (-not (Test-Port $port)) {
            Write-Warning-Custom "Port $port is in use. Finding alternative..."
            $port = Get-AvailablePort -StartPort 8001
            Write-Info "Using port $port instead"
        }
        
        # Start server in background
        Write-Info "Starting FastAPI server on port $port..."
        $job = Start-Job -ScriptBlock {
            param($dir, $port)
            Set-Location $dir
            & ".\venv\Scripts\Activate.ps1"
            python server.py
        } -ArgumentList $BACKEND_DIR, $port
        
        # Wait for server to be ready
        Write-Info "Waiting for backend to be ready..."
        $maxAttempts = 30
        $attempt = 0
        $ready = $false
        
        while ($attempt -lt $maxAttempts -and -not $ready) {
            Start-Sleep -Seconds 1
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $ready = $true
                }
            } catch {
                $attempt++
            }
        }
        
        if ($ready) {
            Write-Success "Backend server is ready!"
            Write-Info "API Documentation: http://localhost:$port/docs"
            Write-Log "Backend started on port $port"
            return $job
        } else {
            Write-Error-Custom "Backend failed to start within timeout"
            Stop-Job $job
            Remove-Job $job
            throw "Backend startup timeout"
        }
    } catch {
        Write-Error-Custom "Failed to start backend: $_"
        Write-Log "Backend start error: $_" "ERROR"
        throw
    } finally {
        Pop-Location
    }
}

# Start frontend
function Start-Frontend {
    param([string]$Platform = "default")
    
    Write-Step "Starting Frontend Application"
    
    Push-Location $FRONTEND_DIR
    try {
        # Clear cache if requested
        if ($Platform -eq "clean") {
            Write-Info "Clearing Metro bundler cache..."
            npx expo start --clear
        } else {
            Write-Info "Starting Expo development server..."
            
            switch ($Platform) {
                "android" {
                    Write-Info "Launching on Android..."
                    npx expo start --android
                }
                "ios" {
                    Write-Info "Launching on iOS..."
                    npx expo start --ios
                }
                "web" {
                    Write-Info "Launching in web browser..."
                    npx expo start --web
                }
                default {
                    Write-Info "Starting Expo (scan QR code with Expo Go app)..."
                    npx expo start
                }
            }
        }
    } catch {
        Write-Error-Custom "Failed to start frontend: $_"
        Write-Log "Frontend start error: $_" "ERROR"
        throw
    } finally {
        Pop-Location
    }
}

# Build APK
function Build-Android {
    Write-Step "Building Android APK"
    
    Push-Location $FRONTEND_DIR
    try {
        Write-Info "Installing EAS CLI..."
        npm install -g eas-cli
        
        Write-Info "Configuring EAS Build..."
        eas build:configure
        
        Write-Info "Building Android APK (this may take 10-20 minutes)..."
        eas build --platform android --profile preview
        
        Write-Success "Android build complete!"
        Write-Info "Download your APK from: https://expo.dev"
    } catch {
        Write-Error-Custom "Android build failed: $_"
        Write-Log "Android build error: $_" "ERROR"
        throw
    } finally {
        Pop-Location
    }
}

# Clean project
function Clear-Project {
    Write-Step "Cleaning Project"
    
    # Backend cleanup
    Write-Info "Cleaning backend..."
    if (Test-Path "$BACKEND_DIR\venv") {
        Remove-Item "$BACKEND_DIR\venv" -Recurse -Force
        Write-Success "Backend virtual environment removed"
    }
    
    # Frontend cleanup
    Write-Info "Cleaning frontend..."
    $cleanPaths = @(
        "$FRONTEND_DIR\node_modules",
        "$FRONTEND_DIR\.expo",
        "$FRONTEND_DIR\.metro-cache",
        "$FRONTEND_DIR\package-lock.json"
    )
    
    foreach ($path in $cleanPaths) {
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force
            Write-Success "Removed: $path"
        }
    }
    
    Write-Success "Project cleaned successfully"
}

# Show status
function Show-Status {
    Write-Step "System Status"
    
    # Check backend
    Write-Info "Backend Status:"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing -TimeoutSec 2
        Write-Success "Backend: Running (http://localhost:8001)"
    } catch {
        Write-Warning-Custom "Backend: Not running"
    }
    
    # Check MongoDB
    Write-Info "`nMongoDB Status:"
    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($mongoService -and $mongoService.Status -eq "Running") {
        Write-Success "MongoDB: Running"
    } else {
        Write-Warning-Custom "MongoDB: Not running"
    }
    
    # Check processes
    Write-Info "`nRunning Processes:"
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Success "Node.js processes: $($nodeProcesses.Count)"
    }
    
    $pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
    if ($pythonProcesses) {
        Write-Success "Python processes: $($pythonProcesses.Count)"
    }
}

# Show help
function Show-Help {
    Write-Host @"

PAYO Launcher - Usage Guide

COMMANDS:
  setup       - Install all dependencies and configure environment
  start       - Start backend and frontend servers
  android     - Launch on Android emulator
  ios         - Launch on iOS simulator
  web         - Launch in web browser
  build       - Build standalone Android APK
  clean       - Clean all build artifacts and dependencies
  status      - Show system status
  help        - Show this help message

OPTIONS:
  -SkipChecks - Skip prerequisite checks
  -Verbose    - Show detailed logging

EXAMPLES:
  .\payo-launcher.ps1 setup
  .\payo-launcher.ps1 start
  .\payo-launcher.ps1 android
  .\payo-launcher.ps1 build
  .\payo-launcher.ps1 clean

QUICK START:
  1. Run: .\payo-launcher.ps1 setup
  2. Run: .\payo-launcher.ps1 start
  3. Scan QR code with Expo Go app

For detailed documentation, see MOBILE_APP_EXECUTION_GUIDE.md

"@ -ForegroundColor White
}

# Main execution
try {
    Show-Banner
    Write-Log "Script started with action: $Action"
    
    # Run pre-flight checks unless skipped
    if (-not $SkipChecks -and $Action -ne 'help' -and $Action -ne 'clean') {
        $checksPass = Test-Prerequisites
        if (-not $checksPass) {
            Write-Error-Custom "`nPrerequisite checks failed. Please install missing components."
            Write-Info "Run with -SkipChecks to bypass checks (not recommended)"
            exit 1
        }
    }
    
    # Execute action
    switch ($Action) {
        'setup' {
            Start-MongoDB
            Install-Backend
            Install-Frontend
            Write-Success "`nSetup complete! Run '.\payo-launcher.ps1 start' to launch the app."
        }
        'start' {
            Start-MongoDB
            $backendJob = Start-Backend
            Start-Sleep -Seconds 2
            Start-Frontend
        }
        'android' {
            Start-MongoDB
            $backendJob = Start-Backend
            Start-Sleep -Seconds 2
            Start-Frontend -Platform "android"
        }
        'ios' {
            Start-MongoDB
            $backendJob = Start-Backend
            Start-Sleep -Seconds 2
            Start-Frontend -Platform "ios"
        }
        'web' {
            Start-MongoDB
            $backendJob = Start-Backend
            Start-Sleep -Seconds 2
            Start-Frontend -Platform "web"
        }
        'build' {
            Build-Android
        }
        'clean' {
            Clear-Project
        }
        'status' {
            Show-Status
        }
        'help' {
            Show-Help
        }
        default {
            Show-Help
        }
    }
    
    Write-Log "Script completed successfully"
} catch {
    Write-Error-Custom "`nAn error occurred: $_"
    Write-Log "Script error: $_" "ERROR"
    Write-Info "Check $LOG_FILE for details"
    exit 1
}

# Made with Bob
