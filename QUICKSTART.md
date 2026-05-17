# PAYO Mobile App - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Setup (5-10 minutes)

**Windows:**
```powershell
.\payo-launcher.ps1 setup
```

**macOS/Linux:**
```bash
chmod +x payo-launcher.sh
./payo-launcher.sh setup
```

**What happens:**
- ✅ Installs all backend dependencies (Python/FastAPI)
- ✅ Installs all frontend dependencies (React Native/Expo)
- ✅ Configures environment variables automatically
- ✅ Sets up MongoDB connection
- ✅ Creates necessary configuration files

### Step 2: Start (2 minutes)

**Windows:**
```powershell
.\payo-launcher.ps1 start
```

**macOS/Linux:**
```bash
./payo-launcher.sh start
```

**What happens:**
- ✅ Starts MongoDB service
- ✅ Launches FastAPI backend server (http://localhost:8001)
- ✅ Starts Expo development server
- ✅ Displays QR code in terminal

### Step 3: Test on Your Phone (1 minute)

1. **Install Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Open Expo Go** app

3. **Scan QR code** shown in your terminal

4. **Wait** for app to load (30-60 seconds first time)

5. **Done!** Start testing PAYO features

---

## 📱 Access Points

Once running, you can access:

- **Backend API:** http://localhost:8001
- **API Documentation:** http://localhost:8001/docs
- **Health Check:** http://localhost:8001/health
- **Mobile App:** Scan QR code with Expo Go

---

## 🎯 Additional Commands

### Launch on Specific Platform

**Android Emulator:**
```bash
./payo-launcher.sh android
```

**iOS Simulator (macOS only):**
```bash
./payo-launcher.sh ios
```

**Web Browser:**
```bash
./payo-launcher.sh web
```

### Check Status

```bash
./payo-launcher.sh status
```

Shows:
- Backend server status
- MongoDB status
- Running processes

### Clean Installation

If you encounter issues:
```bash
./payo-launcher.sh clean
./payo-launcher.sh setup
```

### Build Production APK

```bash
./payo-launcher.sh build
```

Builds standalone Android APK (10-20 minutes)

### Stop Services

**macOS/Linux:**
```bash
./payo-launcher.sh stop
```

**Windows:**
Press `Ctrl+C` in terminal windows

---

## 🔧 System Requirements

### Required
- **Node.js** v18+ ([Download](https://nodejs.org))
- **Python** 3.11+ ([Download](https://python.org))
- **MongoDB** 6.0+ ([Download](https://mongodb.com))

### Optional (for Android development)
- **Java JDK** 17+ ([Download](https://adoptium.net))
- **Android Studio** ([Download](https://developer.android.com/studio))

---

## 🐛 Troubleshooting

### "Permission Denied" (macOS/Linux)
```bash
chmod +x payo-launcher.sh
```

### "Execution Policy" Error (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Port Already in Use"
The launcher automatically finds an available port. Check console output for the actual port.

### "MongoDB Connection Failed"
**Windows:**
```powershell
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### "Expo Go Shows Network Timeout"
1. Ensure phone and computer are on same WiFi
2. Check firewall settings
3. Try tunnel mode:
```bash
cd frontend
npx expo start --tunnel
```

### Still Having Issues?
1. Check logs: `cat payo-launcher.log`
2. Review: `MOBILE_APP_EXECUTION_GUIDE.md`
3. Clean and retry:
```bash
./payo-launcher.sh clean
./payo-launcher.sh setup
```

---

## 📖 Documentation

### Quick Reference
- **This Guide:** QUICKSTART.md
- **Launcher Guide:** LAUNCHER_README.md
- **Complete Setup:** MOBILE_APP_EXECUTION_GUIDE.md

### Implementation Guides
- **Phase 1:** Foundation & Security
- **Phase 2:** Authentication & Advanced Security
- **Phase 3:** Testing & Monitoring
- **Phase 4:** Deployment & DevOps

### Additional Resources
- **UI/UX Suggestions:** 50+ recommendations
- **API Best Practices:** Complete guide
- **Executive Summary:** Project overview

---

## ✅ Verification Checklist

After setup and start, verify:

**Backend:**
- [ ] http://localhost:8001/health returns `{"status":"ok"}`
- [ ] http://localhost:8001/docs shows API documentation
- [ ] No errors in terminal

**Frontend:**
- [ ] QR code displayed in terminal
- [ ] Can scan with Expo Go app
- [ ] App launches without crashes
- [ ] Dashboard screen loads

**Integration:**
- [ ] Dashboard shows transaction data
- [ ] Navigation between screens works
- [ ] No network errors in console

---

## 🎉 Success!

If all checks pass, you're ready to develop with PAYO!

**Next Steps:**
1. Explore the dashboard
2. Test QR code scanning
3. Try transfer functionality
4. Review implementation guides
5. Start building features!

---

## 📞 Need Help?

- **Detailed Guide:** See `MOBILE_APP_EXECUTION_GUIDE.md`
- **Launcher Help:** Run `./payo-launcher.sh help`
- **Logs:** Check `payo-launcher.log` for errors
- **Community:** [Expo Discord](https://chat.expo.dev)

---

**Version:** 2.0.0  
**Last Updated:** May 17, 2026  
**Tech Stack:** React Native + Expo + FastAPI + MongoDB  
**Status:** Production Ready ✅