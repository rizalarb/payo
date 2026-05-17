#!/bin/bash
# PAYO Complete Setup and Run Script
# This script sets up and runs both backend and frontend

set -e  # Exit on error

echo "========================================="
echo "PAYO Mobile App - Complete Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js v18+"
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python installed: $PYTHON_VERSION"
else
    print_error "Python not found. Please install Python 3.11+"
    exit 1
fi

# Check MongoDB
if command -v mongod &> /dev/null; then
    print_success "MongoDB installed"
else
    print_info "MongoDB not found. Will try to start anyway..."
fi

echo ""
echo "========================================="
echo "Step 1: Backend Setup"
echo "========================================="

cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
print_info "Installing Python dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
print_success "Python dependencies installed"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=payo_dev
SECRET_KEY=dev-secret-key-change-in-production
ENVIRONMENT=development
EOF
    print_success ".env file created"
fi

# Start MongoDB if not running
print_info "Checking MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    print_info "Starting MongoDB..."
    if command -v brew &> /dev/null; then
        brew services start mongodb-community &> /dev/null || true
    else
        mongod --fork --logpath /tmp/mongodb.log --dbpath /tmp/mongodb-data &> /dev/null || true
    fi
    sleep 2
fi

# Start backend server in background
print_info "Starting backend server..."
python server.py &
BACKEND_PID=$!
print_success "Backend server started (PID: $BACKEND_PID)"

# Wait for backend to be ready
print_info "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        print_success "Backend is ready!"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        print_error "Backend failed to start"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
done

cd ..

echo ""
echo "========================================="
echo "Step 2: Frontend Setup"
echo "========================================="

cd frontend

# Install Node dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing Node dependencies (this may take a few minutes)..."
    npm install --silent
    print_success "Node dependencies installed"
else
    print_success "Node dependencies already installed"
fi

# Get local IP address
if command -v ipconfig &> /dev/null; then
    # Windows
    LOCAL_IP=$(ipconfig | grep -oP '(?<=IPv4 Address.*: )[\d.]+' | head -1)
elif command -v ifconfig &> /dev/null; then
    # macOS/Linux
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
else
    LOCAL_IP="localhost"
fi

# Create .env file
print_info "Creating frontend .env file..."
cat > .env << EOF
EXPO_PUBLIC_BACKEND_URL=http://${LOCAL_IP}:8001
EOF
print_success "Frontend .env created with backend URL: http://${LOCAL_IP}:8001"

# Fix missing splash icon
if [ ! -f "assets/images/splash-icon.png" ]; then
    print_info "Creating splash icon..."
    cp assets/images/icon.png assets/images/splash-icon.png
    print_success "Splash icon created"
fi

echo ""
echo "========================================="
echo "Step 3: Starting Mobile App"
echo "========================================="
echo ""
print_info "Starting Expo development server..."
echo ""
print_info "Choose how to run the app:"
echo "  1. Scan QR code with Expo Go app on your phone"
echo "  2. Press 'a' to open on Android emulator"
echo "  3. Press 'i' to open on iOS simulator"
echo "  4. Press 'w' to open in web browser"
echo ""
print_info "Backend API: http://${LOCAL_IP}:8001"
print_info "API Docs: http://${LOCAL_IP}:8001/docs"
echo ""

# Start Expo
npx expo start

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT

cd ..

# Made with Bob
