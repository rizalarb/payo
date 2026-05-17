# PAYO Advanced Launcher - Complete Guide

## 🚀 Overview

The PAYO Advanced Launcher is a production-ready automation system that handles complete setup, configuration, and deployment of the PAYO mobile fintech application.

**Available Scripts:**
- `payo-launcher.ps1` - Advanced PowerShell launcher (Windows)
- `payo-launcher.sh` - Advanced Bash launcher (macOS/Linux)
- `setup-and-run.bat` - Simple batch script (Windows)
- `setup-and-run.sh` - Simple bash script (macOS/Linux)

---

## 📋 Features

### ✅ Automated Environment Detection
- Detects Node.js, Python, Java JDK, Android SDK
- Validates versions and compatibility
- Checks for MongoDB installation
- Verifies Expo CLI availability

### ✅ Intelligent Dependency Management
- Installs all backend dependencies (Python packages)
- Installs all frontend dependencies (npm packages)
- Creates virtual environments automatically
- Handles version conflicts

### ✅ Dynamic Configuration
- Auto-detects local IP address
- Configures API endpoints dynamically
- Creates environment files automatically
- Handles port conflicts

### ✅ Platform Support
- Android emulator launch
- iOS simulator launch
- Web browser launch
- Physical device via Expo Go

### ✅ Build Automation
- Standalone APK builds
- Production optimization
- Signing configuration
- EAS Build integration

### ✅ Error Handling
- Comprehensive error messages
- Detailed logging
- Troubleshooting suggestions
- Rollback mechanisms

### ✅ Process Management
- Background service management
- Health check monitoring
- Graceful shutdown
- Status reporting

---

## 🎯 Quick Start

### Windows (PowerShell)

```powershell
# Make script executable (first time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run setup
.\payo-launcher.ps1 setup

# Start application
.\payo-launcher.ps1 start
```

### macOS/Linux (Bash)

```bash
# Make script executable (first time only)
chmod +x payo-launcher.sh

# Run setup
./payo-launcher.sh setup

# Start application
./payo-launcher.sh start
```

---

## 📖 Command Reference

### Setup Command
Installs all dependencies and configures the environment.

```bash
# Windows
.\payo-launcher.ps1 setup

# macOS/Linux
./payo-launcher.sh setup
```

**What it does:**
1. Checks all prerequisites
2. Starts MongoDB service
3. Creates Python virtual environment
4. Installs backend dependencies
5. Installs frontend dependencies
6. Creates environment configuration files
7. Fixes missing assets (splash icon)
8. Validates installation

**Time:** 5-10 minutes (depending on internet speed)

### Start Command
Starts both backend and frontend servers.

```bash
# Windows
.\payo-launcher.ps1 start

# macOS/Linux
./payo-launcher.sh start
```

**What it does:**
1. Starts MongoDB service
2. Launches backend server (FastAPI)
3. Waits for backend to be ready
4. Starts Expo development server
5. Displays QR code for scanning

**Access:**
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs
- Mobile App: Scan QR code with Expo Go

### Android Command
Launches app on Android emulator.

```bash
# Windows
.\payo-launcher.ps1 android

# macOS/Linux
./payo-launcher.sh android
```

**Prerequisites:**
- Android Studio installed
- Android emulator created
- Emulator running (or will auto-launch)

### iOS Command
Launches app on iOS simulator (macOS only).

```bash
./payo-launcher.sh ios
```

**Prerequisites:**
- Xcode installed (macOS only)
- iOS simulator available

### Web Command
Launches app in web browser.

```bash
# Windows
.\payo-launcher.ps1 web

# macOS/Linux
./payo-launcher.sh web
```

**Opens:** http://localhost:19006

### Build Command
Builds standalone Android APK.

```bash
# Windows
.\payo-launcher.ps1 build

# macOS/Linux
./payo-launcher.sh build
```

**What it does:**
1. Installs EAS CLI
2. Configures EAS Build
3. Builds production APK
4. Uploads to Expo servers

**Time:** 10-20 minutes
**Output:** Download link from https://expo.dev

### Clean Command
Removes all build artifacts and dependencies.

```bash
# Windows
.\payo-launcher.ps1 clean

# macOS/Linux
./payo-launcher.sh clean
```

**What it removes:**
- Backend virtual environment
- Frontend node_modules
- Metro bundler cache
- Expo cache
- Log files

**Use when:**
- Dependency conflicts occur
- Need fresh installation
- Switching branches
- Troubleshooting issues

### Status Command
Shows current system status.

```bash
# Windows
.\payo-launcher.ps1 status

# macOS/Linux
./payo-launcher.sh status
```

**Displays:**
- Backend server status
- MongoDB status
- Running processes
- Port usage
- PID information

### Stop Command
Stops all running services (Linux/macOS only).

```bash
./payo-launcher.sh stop
```

**What it stops:**
- Backend server
- Expo development server
- All related processes

### Help Command
Shows usage information.

```bash
# Windows
.\payo-launcher.ps1 help

# macOS/Linux
./payo-launcher.sh help
```

---

## 🔧 Advanced Options

### Skip Prerequisite Checks

```bash
# Windows
.\payo-launcher.ps1 setup -SkipChecks

# macOS/Linux
./payo-launcher.sh setup --skip-checks
```

**Use when:**
- You know all prerequisites are installed
- Running in CI/CD environment
- Troubleshooting check failures

**Warning:** May cause issues if prerequisites are missing

### Verbose Logging

```bash
# Windows
.\payo-launcher.ps1 start -Verbose

# macOS/Linux
./payo-launcher.sh start --verbose
```

**Enables:**
- Detailed operation logs
- Debug information
- Step-by-step progress
- Error stack traces

**Output:** Console + log file

---

## 📊 System Requirements

### Minimum Requirements
- **OS:** Windows 10+, macOS 10.15+, Ubuntu 20.04+
- **RAM:** 8GB (16GB recommended)
- **Disk:** 10GB free space
- **Network:** Stable internet connection

### Required Software
- **Node.js:** v18.0.0 or higher
- **Python:** 3.11.0 or higher
- **MongoDB:** 6.0 or higher
- **npm:** 9.0.0 or higher

### Optional Software
- **Java JDK:** 17+ (for Android builds)
- **Android Studio:** Latest (for Android emulator)
- **Xcode:** Latest (for iOS simulator, macOS only)

---

## 🐛 Troubleshooting

### Issue: "Execution Policy" Error (Windows)

**Error:**
```
.\payo-launcher.ps1 : File cannot be loaded because running scripts is disabled
```

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Permission Denied" (macOS/Linux)

**Error:**
```
bash: ./payo-launcher.sh: Permission denied
```

**Solution:**
```bash
chmod +x payo-launcher.sh
```

### Issue: "Port 8001 Already in Use"

**Solution:**
The launcher automatically finds an available port. Check the console output for the actual port being used.

**Manual fix:**
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8001 | xargs kill -9
```

### Issue: "MongoDB Connection Failed"

**Solution:**
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Issue: "Node Modules Not Found"

**Solution:**
```bash
# Run clean and setup again
.\payo-launcher.ps1 clean
.\payo-launcher.ps1 setup
```

### Issue: "Expo Go Shows Network Timeout"

**Solution:**
1. Ensure phone and computer are on same WiFi
2. Check firewall settings
3. Use tunnel mode:
```bash
cd frontend
npx expo start --tunnel
```

### Issue: "Backend Not Responding"

**Check logs:**
```bash
# Windows
type backend.log

# macOS/Linux
cat backend.log
```

**Restart backend:**
```bash
.\payo-launcher.ps1 stop
.\payo-launcher.ps1 start
```

---

## 📝 Log Files

### Location
- **Main log:** `payo-launcher.log`
- **Backend log:** `backend.log`
- **PID file:** `backend.pid`

### Log Levels
- **INFO:** Normal operations
- **WARNING:** Non-critical issues
- **ERROR:** Critical failures

### Viewing Logs

```bash
# Windows
type payo-launcher.log

# macOS/Linux
tail -f payo-launcher.log
```

---

## 🔐 Security Notes

### Development Mode
- Uses development secrets
- CORS allows all origins
- Debug logging enabled
- No authentication required

### Production Mode
- Change SECRET_KEY in .env
- Configure CORS whitelist
- Enable authentication
- Use HTTPS
- Set LOG_LEVEL=WARNING

---

## 🚀 Deployment Workflow

### Development
```bash
1. ./payo-launcher.sh setup
2. ./payo-launcher.sh start
3. Develop and test
4. ./payo-launcher.sh stop
```

### Testing
```bash
1. ./payo-launcher.sh clean
2. ./payo-launcher.sh setup
3. ./payo-launcher.sh start
4. Run tests
5. ./payo-launcher.sh status
```

### Production Build
```bash
1. ./payo-launcher.sh setup
2. Update .env files with production values
3. ./payo-launcher.sh build
4. Download APK from Expo
5. Test APK on device
6. Deploy to Play Store
```

---

## 📞 Support

### Documentation
- **Main Guide:** MOBILE_APP_EXECUTION_GUIDE.md
- **Phase Guides:** PHASE1-4_IMPLEMENTATION_GUIDE.md
- **API Docs:** http://localhost:8001/docs (when running)

### Community
- **Expo Discord:** https://chat.expo.dev
- **React Native:** https://reactnative.dev/community
- **FastAPI:** https://fastapi.tiangolo.com/community

### Logs
Check `payo-launcher.log` for detailed error information.

---

## 🎯 Best Practices

### Before Starting
1. Close other development servers
2. Ensure MongoDB is not running elsewhere
3. Check available disk space
4. Update Node.js and Python if needed

### During Development
1. Use `status` command to monitor services
2. Check logs regularly
3. Restart services if issues occur
4. Keep dependencies updated

### After Development
1. Stop all services
2. Commit changes
3. Clean build artifacts if needed
4. Document any configuration changes

---

## 📈 Performance Tips

### Faster Startup
- Keep MongoDB running
- Don't clean unless necessary
- Use SSD for node_modules
- Close unnecessary applications

### Better Development Experience
- Use physical device instead of emulator
- Enable hot reload
- Use tunnel mode for remote testing
- Monitor memory usage

---

## 🔄 Update Procedure

### Update Launcher Scripts
```bash
# Backup current scripts
cp payo-launcher.sh payo-launcher.sh.backup

# Download new version
# Replace files

# Test new version
./payo-launcher.sh help
```

### Update Dependencies
```bash
# Backend
cd backend
source venv/bin/activate
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm update
```

---

## ✅ Verification Checklist

After running setup, verify:

- [ ] Backend responds at http://localhost:8001/health
- [ ] API docs accessible at http://localhost:8001/docs
- [ ] MongoDB connection successful
- [ ] Frontend shows QR code
- [ ] Can scan QR with Expo Go
- [ ] App launches without errors
- [ ] Dashboard loads data
- [ ] Navigation works
- [ ] No console errors

---

## 🎉 Success!

If all checks pass, you're ready to develop with PAYO!

**Next Steps:**
1. Scan QR code with Expo Go app
2. Test all features
3. Review Phase 1-4 implementation guides
4. Start building your fintech app!

---

**Version:** 2.0.0  
**Last Updated:** May 17, 2026  
**Status:** Production Ready ✅