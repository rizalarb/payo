# PAYO Mobile App

> 📱 React Native (Expo) Mobile Application untuk PAYO POS

## 📋 Overview

Aplikasi mobile PAYO yang berjalan di Android dan iOS dengan fitur:
- QR/QRIS Payment
- Voice Command (Speech-to-Text)
- Transaction Management
- Offline-first architecture

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Expo CLI
- Android Studio / Xcode (untuk emulator)
- Expo Go app (untuk testing di device fisik)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```

### Running on Device

1. Install **Expo Go** dari Play Store / App Store
2. Scan QR code yang muncul di terminal
3. Aplikasi akan terbuka di Expo Go

## 📁 Struktur

```
frontend/
├── app/                    # Screens (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   ├── _layout.tsx        # Root layout
│   ├── scan-qris.tsx      # Scan QR screen
│   ├── scan-receipt.tsx   # OCR receipt screen
│   ├── transfer.tsx       # Transfer screen
│   ├── withdraw.tsx       # Withdraw screen
│   └── ...
│
├── src/
│   ├── api.ts             # API client
│   ├── components/        # Reusable components
│   ├── qvac/             # QVAC SDK integration
│   └── theme.ts          # Theme configuration
│
├── assets/
│   ├── fonts/            # Custom fonts
│   └── images/           # Static images
│
├── app.json              # Expo configuration
└── package.json
```

## 📱 Screens

| Screen | Path | Description |
|--------|------|-------------|
| Home | `/(tabs)/` | Dashboard utama |
| Scan QRIS | `/scan-qris` | Scan QR payment |
| Scan Receipt | `/scan-receipt` | OCR receipt |
| Transfer | `/transfer` | Transfer dana |
| Withdraw | `/withdraw` | Tarik dana |
| All Transactions | `/all-transactions` | Riwayat transaksi |
| Setup PIN | `/setup-pin` | Setup keamanan |

## 🔧 Configuration

### Environment Variables

Edit `.env`:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

### App Configuration

Edit `app.json`:
```json
{
  "expo": {
    "name": "PAYO",
    "slug": "payo",
    "version": "1.0.0"
  }
}
```

## 🎨 Theme

Tema aplikasi dikonfigurasi di `src/theme.ts`:
- Primary Color: Hijau (#00C853)
- Font: System default
- Dark/Light mode support

## 🔌 API Integration

API client di `src/api.ts`:
```typescript
import { api } from './api';

// Get transactions
const transactions = await api.getTransactions();

// Create transaction
await api.createTransaction(data);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## 📦 Build

### Development Build
```bash
npx expo build:android
npx expo build:ios
```

### Production Build
```bash
eas build --platform android
eas build --platform ios
```

## 📄 License

MIT © PAYO Team
