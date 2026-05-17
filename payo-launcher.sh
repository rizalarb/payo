#!/bin/bash
# PAYO Mobile App - Advanced Bash Launcher
# Production-ready automation script for macOS/Linux
# Version: 2.0.0

set -e  # Exit on error
set -o pipefail  # Pipe failures

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_FILE="$SCRIPT_DIR/payo-launcher.log"
VERBOSE=false
SKIP_CHECKS=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output functions
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_step() { echo -e "\n${MAGENTA}═══ $1 ═══${NC}"; }

# Logging function
log_message() {
    local level="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $1" >> "$LOG_FILE"
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[$level] $1${NC}"
    fi
}

# Banner
show_banner() {
    clear
    cat << "EOF"
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
EOF
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check port availability
check_port() {
    local port=$1
    if command_exists lsof; then
        ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    elif command_exists netstat; then
        ! netstat -tuln | grep -q ":$port "
    else
        return 0  # Assume available if no tool found
    fi
}

# Find available port
find_available_port() {
    local start_port=${1:-8001}
    local port=$start_port
    while ! check_port $port; do
        ((port++))
        if [ $port -gt $((start_port + 100)) ]; then
            print_error "No available ports found in range $start_port-$((start_port+100))"
            exit 1
        fi
    done
    echo $port
}

# Get local IP address
get_local_ip() {
    local ip=""
    if command_exists ip; then
        ip=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    elif command_exists ifconfig; then
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
    echo "${ip:-localhost}"
}

# Pre-flight checks
check_prerequisites() {
    print_step "Running Pre-flight Checks"
    local all_good=true
    
    # Check Node.js
    print_info "Checking Node.js..."
    if command_exists node; then
        local node_version=$(node --version)
        print_success "Node.js installed: $node_version"
        log_message "Node.js version: $node_version"
    else
        print_error "Node.js not found. Please install Node.js v18+ from https://nodejs.org"
        all_good=false
    fi
    
    # Check npm
    print_info "Checking npm..."
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_success "npm installed: v$npm_version"
        log_message "npm version: $npm_version"
    else
        print_error "npm not found"
        all_good=false
    fi
    
    # Check Python
    print_info "Checking Python..."
    if command_exists python3; then
        local python_version=$(python3 --version)
        print_success "Python installed: $python_version"
        log_message "Python version: $python_version"
    else
        print_error "Python not found. Please install Python 3.11+ from https://python.org"
        all_good=false
    fi
    
    # Check pip
    print_info "Checking pip..."
    if command_exists pip3; then
        print_success "pip installed"
    else
        print_warning "pip not found"
    fi
    
    # Check Java (for Android)
    print_info "Checking Java JDK..."
    if command_exists java; then
        local java_version=$(java -version 2>&1 | head -1)
        print_success "Java JDK installed: $java_version"
        log_message "Java version: $java_version"
    else
        print_warning "Java JDK not found (required for Android builds)"
    fi
    
    # Check Android SDK
    print_info "Checking Android SDK..."
    if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
        print_success "Android SDK found: $ANDROID_HOME"
        log_message "Android SDK: $ANDROID_HOME"
    else
        print_warning "Android SDK not found (required for Android emulator)"
    fi
    
    # Check MongoDB
    print_info "Checking MongoDB..."
    if command_exists mongod; then
        print_success "MongoDB installed"
        log_message "MongoDB found"
    else
        print_warning "MongoDB not found. Install from https://mongodb.com"
    fi
    
    # Check Expo CLI
    print_info "Checking Expo CLI..."
    if npx expo --version >/dev/null 2>&1; then
        local expo_version=$(npx expo --version 2>/dev/null)
        print_success "Expo CLI available: v$expo_version"
        log_message "Expo CLI version: $expo_version"
    else
        print_warning "Expo CLI not found (will be installed)"
    fi
    
    if [ "$all_good" = false ]; then
        return 1
    fi
    return 0
}

# Setup backend
install_backend() {
    print_step "Setting Up Backend"
    
    cd "$BACKEND_DIR"
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    fi
    
    # Activate virtual environment
    print_info "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip
    print_info "Upgrading pip..."
    python -m pip install --upgrade pip --quiet
    
    # Install dependencies
    print_info "Installing Python dependencies..."
    pip install -r requirements.txt --quiet
    print_success "Backend dependencies installed"
    
    # Create .env if not exists
    if [ ! -f ".env" ]; then
        print_info "Creating backend .env file..."
        cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=payo_dev
SECRET_KEY=dev-secret-key-change-in-production
ENVIRONMENT=development
LOG_LEVEL=INFO
EOF
        print_success "Backend .env created"
    fi
    
    print_success "Backend setup complete"
    cd "$SCRIPT_DIR"
}

# Setup frontend
install_frontend() {
    print_step "Setting Up Frontend"
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node dependencies (this may take a few minutes)..."
        npm install --silent
        print_success "Frontend dependencies installed"
    else
        print_success "Frontend dependencies already installed"
    fi
    
    # Get local IP
    local local_ip=$(get_local_ip)
    local backend_port=8001
    
    # Create .env
    print_info "Creating frontend .env file..."
    echo "EXPO_PUBLIC_BACKEND_URL=http://${local_ip}:${backend_port}" > .env
    print_success "Frontend .env created (Backend: http://${local_ip}:${backend_port})"
    
    # Fix missing splash icon
    if [ -f "assets/images/icon.png" ] && [ ! -f "assets/images/splash-icon.png" ]; then
        print_info "Creating splash icon..."
        cp assets/images/icon.png assets/images/splash-icon.png
        print_success "Splash icon created"
    fi
    
    print_success "Frontend setup complete"
    cd "$SCRIPT_DIR"
}

# Start MongoDB
start_mongodb() {
    print_info "Starting MongoDB..."
    
    if command_exists brew; then
        # macOS with Homebrew
        if brew services list | grep -q "mongodb-community.*started"; then
            print_success "MongoDB already running"
        else
            brew services start mongodb-community >/dev/null 2>&1 || true
            sleep 2
            print_success "MongoDB service started"
        fi
    elif command_exists systemctl; then
        # Linux with systemd
        if systemctl is-active --quiet mongod; then
            print_success "MongoDB already running"
        else
            sudo systemctl start mongod >/dev/null 2>&1 || true
            sleep 2
            print_success "MongoDB service started"
        fi
    else
        # Try to start manually
        if pgrep -x "mongod" > /dev/null; then
            print_success "MongoDB already running"
        else
            print_warning "MongoDB service not found. Please start MongoDB manually."
        fi
    fi
}

# Start backend server
start_backend() {
    print_step "Starting Backend Server"
    
    cd "$BACKEND_DIR"
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check port
    local port=8001
    if ! check_port $port; then
        print_warning "Port $port is in use. Finding alternative..."
        port=$(find_available_port 8001)
        print_info "Using port $port instead"
    fi
    
    # Start server in background
    print_info "Starting FastAPI server on port $port..."
    python server.py > "$SCRIPT_DIR/backend.log" 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "$SCRIPT_DIR/backend.pid"
    
    # Wait for server to be ready
    print_info "Waiting for backend to be ready..."
    local max_attempts=30
    local attempt=0
    local ready=false
    
    while [ $attempt -lt $max_attempts ] && [ "$ready" = false ]; do
        sleep 1
        if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            ready=true
        fi
        ((attempt++))
    done
    
    if [ "$ready" = true ]; then
        print_success "Backend server is ready!"
        print_info "API Documentation: http://localhost:$port/docs"
        log_message "Backend started on port $port (PID: $backend_pid)"
    else
        print_error "Backend failed to start within timeout"
        kill $backend_pid 2>/dev/null || true
        exit 1
    fi
    
    cd "$SCRIPT_DIR"
}

# Start frontend
start_frontend() {
    local platform="${1:-default}"
    
    print_step "Starting Frontend Application"
    
    cd "$FRONTEND_DIR"
    
    case "$platform" in
        android)
            print_info "Launching on Android..."
            npx expo start --android
            ;;
        ios)
            print_info "Launching on iOS..."
            npx expo start --ios
            ;;
        web)
            print_info "Launching in web browser..."
            npx expo start --web
            ;;
        clean)
            print_info "Clearing Metro bundler cache..."
            npx expo start --clear
            ;;
        *)
            print_info "Starting Expo (scan QR code with Expo Go app)..."
            npx expo start
            ;;
    esac
    
    cd "$SCRIPT_DIR"
}

# Build Android APK
build_android() {
    print_step "Building Android APK"
    
    cd "$FRONTEND_DIR"
    
    print_info "Installing EAS CLI..."
    npm install -g eas-cli
    
    print_info "Configuring EAS Build..."
    eas build:configure
    
    print_info "Building Android APK (this may take 10-20 minutes)..."
    eas build --platform android --profile preview
    
    print_success "Android build complete!"
    print_info "Download your APK from: https://expo.dev"
    
    cd "$SCRIPT_DIR"
}

# Clean project
clean_project() {
    print_step "Cleaning Project"
    
    # Backend cleanup
    print_info "Cleaning backend..."
    if [ -d "$BACKEND_DIR/venv" ]; then
        rm -rf "$BACKEND_DIR/venv"
        print_success "Backend virtual environment removed"
    fi
    
    # Frontend cleanup
    print_info "Cleaning frontend..."
    local clean_paths=(
        "$FRONTEND_DIR/node_modules"
        "$FRONTEND_DIR/.expo"
        "$FRONTEND_DIR/.metro-cache"
        "$FRONTEND_DIR/package-lock.json"
    )
    
    for path in "${clean_paths[@]}"; do
        if [ -e "$path" ]; then
            rm -rf "$path"
            print_success "Removed: $path"
        fi
    done
    
    # Clean logs and PIDs
    rm -f "$SCRIPT_DIR/backend.log" "$SCRIPT_DIR/backend.pid"
    
    print_success "Project cleaned successfully"
}

# Show status
show_status() {
    print_step "System Status"
    
    # Check backend
    print_info "Backend Status:"
    if curl -s "http://localhost:8001/health" >/dev/null 2>&1; then
        print_success "Backend: Running (http://localhost:8001)"
    else
        print_warning "Backend: Not running"
    fi
    
    # Check MongoDB
    print_info "\nMongoDB Status:"
    if pgrep -x "mongod" > /dev/null; then
        print_success "MongoDB: Running"
    else
        print_warning "MongoDB: Not running"
    fi
    
    # Check processes
    print_info "\nRunning Processes:"
    local node_count=$(pgrep -c node 2>/dev/null || echo 0)
    if [ $node_count -gt 0 ]; then
        print_success "Node.js processes: $node_count"
    fi
    
    local python_count=$(pgrep -c python 2>/dev/null || echo 0)
    if [ $python_count -gt 0 ]; then
        print_success "Python processes: $python_count"
    fi
    
    # Check PID file
    if [ -f "$SCRIPT_DIR/backend.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/backend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            print_success "Backend PID: $pid (running)"
        else
            print_warning "Backend PID: $pid (not running)"
        fi
    fi
}

# Stop all services
stop_services() {
    print_step "Stopping Services"
    
    # Stop backend
    if [ -f "$SCRIPT_DIR/backend.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/backend.pid")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null || true
            print_success "Backend stopped (PID: $pid)"
        fi
        rm -f "$SCRIPT_DIR/backend.pid"
    fi
    
    # Stop any remaining Python processes
    pkill -f "python.*server.py" 2>/dev/null || true
    
    # Stop Expo
    pkill -f "expo start" 2>/dev/null || true
    
    print_success "All services stopped"
}

# Show help
show_help() {
    cat << EOF

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
  stop        - Stop all running services
  help        - Show this help message

OPTIONS:
  --skip-checks  - Skip prerequisite checks
  --verbose      - Show detailed logging

EXAMPLES:
  ./payo-launcher.sh setup
  ./payo-launcher.sh start
  ./payo-launcher.sh android
  ./payo-launcher.sh build
  ./payo-launcher.sh clean

QUICK START:
  1. Run: ./payo-launcher.sh setup
  2. Run: ./payo-launcher.sh start
  3. Scan QR code with Expo Go app

For detailed documentation, see MOBILE_APP_EXECUTION_GUIDE.md

EOF
}

# Parse arguments
ACTION="${1:-help}"
shift || true

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Main execution
main() {
    show_banner
    log_message "Script started with action: $ACTION"
    
    # Run pre-flight checks unless skipped
    if [ "$SKIP_CHECKS" = false ] && [ "$ACTION" != "help" ] && [ "$ACTION" != "clean" ] && [ "$ACTION" != "stop" ]; then
        if ! check_prerequisites; then
            print_error "\nPrerequisite checks failed. Please install missing components."
            print_info "Run with --skip-checks to bypass checks (not recommended)"
            exit 1
        fi
    fi
    
    # Execute action
    case "$ACTION" in
        setup)
            start_mongodb
            install_backend
            install_frontend
            print_success "\nSetup complete! Run './payo-launcher.sh start' to launch the app."
            ;;
        start)
            start_mongodb
            start_backend
            sleep 2
            start_frontend
            ;;
        android)
            start_mongodb
            start_backend
            sleep 2
            start_frontend android
            ;;
        ios)
            start_mongodb
            start_backend
            sleep 2
            start_frontend ios
            ;;
        web)
            start_mongodb
            start_backend
            sleep 2
            start_frontend web
            ;;
        build)
            build_android
            ;;
        clean)
            stop_services
            clean_project
            ;;
        status)
            show_status
            ;;
        stop)
            stop_services
            ;;
        help|*)
            show_help
            ;;
    esac
    
    log_message "Script completed successfully"
}

# Trap errors
trap 'print_error "An error occurred on line $LINENO"; log_message "Script error on line $LINENO" "ERROR"; exit 1' ERR

# Run main
main

# Made with Bob
