#!/bin/bash
# ============================================================
# PAYO On-Device AI - Linux/macOS Installation Script
# STT (Speech-to-Text) + QR Engine
# 100% Offline Processing - Zero Cloud Dependencies
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print functions
print_header() {
    echo -e "\n${BLUE}${BOLD}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  PAYO On-Device AI - Installation Script${NC}"
    echo -e "${BLUE}${BOLD}  STT (Speech-to-Text) + QR Engine${NC}"
    echo -e "${BLUE}${BOLD}  100% Offline - Zero Cloud${NC}"
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${YELLOW}[$1/5]${NC} $2"
}

print_ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ============================================================
# MAIN SCRIPT
# ============================================================

print_header

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================================
# STEP 1: Check Node.js
# ============================================================
print_step 1 "Checking Node.js version..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo ""
    echo "Please install Node.js v20+ using one of these methods:"
    echo ""
    echo "  macOS (Homebrew):"
    echo "    brew install node@20"
    echo ""
    echo "  Ubuntu/Debian:"
    echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "    sudo apt-get install -y nodejs"
    echo ""
    echo "  Or download from: https://nodejs.org/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 20 ]; then
    print_error "Node.js version v$NODE_VERSION is too old!"
    echo "Required: v20.0.0 or higher"
    echo ""
    echo "Please upgrade Node.js from: https://nodejs.org/"
    exit 1
fi

print_ok "Node.js v$NODE_VERSION"
echo ""

# ============================================================
# STEP 2: Check npm
# ============================================================
print_step 2 "Checking npm..."

if ! command -v npm &> /dev/null; then
    print_error "npm is not available!"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_ok "npm v$NPM_VERSION"
echo ""

# ============================================================
# STEP 3: Check optional dependencies
# ============================================================
print_step 3 "Checking optional dependencies..."

# Check for ffmpeg (needed for audio processing)
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n1 | awk '{print $3}')
    print_ok "ffmpeg found: $FFMPEG_VERSION"
else
    print_warning "ffmpeg not found (will use bundled version)"
    echo "  For better performance, install ffmpeg:"
    echo "    macOS: brew install ffmpeg"
    echo "    Ubuntu: sudo apt-get install ffmpeg"
fi

echo ""

# ============================================================
# STEP 4: Install npm dependencies
# ============================================================
print_step 4 "Installing npm dependencies..."
echo "This may take 2-5 minutes..."
echo ""

# Use npm ci if lock file exists, otherwise npm install
if [ -f "package-lock.json" ]; then
    npm ci --prefer-offline
else
    npm install --prefer-offline
fi

print_ok "Dependencies installed successfully!"
echo ""

# ============================================================
# STEP 5: Download AI Models
# ============================================================
print_step 5 "Downloading AI models for offline use..."
echo ""
echo "Models to download:"
echo "  - Whisper Tiny (STT) : ~75MB"
echo "  - QR Assets          : ~1MB"
echo ""

node scripts/download-models.js || {
    print_warning "Some models failed to download."
    echo "You can retry with: npm run download-models"
}

echo ""

# ============================================================
# VERIFICATION
# ============================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Verifying Installation...${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""

node scripts/verify-setup.js

# ============================================================
# SUCCESS MESSAGE
# ============================================================
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  INSTALLATION COMPLETE!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Quick Commands:"
echo "  ---------------"
echo "  Start Server    : npm start"
echo "  Development     : npm run dev"
echo "  Run Tests       : npm test"
echo "  Download Models : npm run download-models"
echo ""
echo "  For more info, see README.md"
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo ""
