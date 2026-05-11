# PAYO On-Device AI Engine

> 🎤 STT (Speech-to-Text) + 📱 QR Code Engine — **100% Offline, Zero Cloud**

## 🔒 Privacy First

- ✅ **100% Offline** - Tidak ada data yang dikirim ke server setelah setup
- ✅ **On-Device AI** - Semua inferensi berjalan lokal di device
- ✅ **No Cloud APIs** - Tidak butuh internet setelah model ter-download
- ✅ **UU PDP Ready** - Data tidak pernah keluar dari device

## 🛠 Technology Stack

### Primary: @qvac/sdk (Tether)
- **Engine**: whisper.cpp (local inference)
- **Models**: Download sekali, cache permanen, run offline selamanya
- **Platform**: Windows, macOS, Linux, iOS, Android
- **Features**: STT, TTS, LLM, OCR, Embeddings - semua offline

### Fallback: @xenova/transformers
- Jika QVAC tidak tersedia, otomatis pakai Transformers.js
- ONNX-based inference

## 📋 Requirements

- **Node.js**: v20.0.0 atau lebih tinggi
- **RAM**: Minimal 4GB (disarankan 8GB)
- **Storage**: ~40-250MB untuk model STT
- **OS**: Windows 10/11, macOS, Linux

## 🚀 Quick Start

### Windows
```cmd
# Double-click atau jalankan di CMD
install.cmd
```

### Linux/macOS
```bash
chmod +x install.sh
./install.sh
```

### Manual
```bash
npm install
npm run download-models
npm start
```

## 📁 Struktur Direktori

```
on-device-ai/
├── config/              # Konfigurasi
│   └── models.json      # Daftar model & engine
├── models/              # Model AI (offline)
│   ├── stt/             # Whisper models (QVAC/Transformers)
│   └── qr/              # QR/QRIS config
├── scripts/             # Script instalasi & download
│   ├── download-models.js
│   └── verify-setup.js
├── src/                 # Source code
│   ├── stt/
│   │   ├── engine.js        # Transformers engine
│   │   └── qvac-engine.js   # QVAC engine (primary)
│   ├── qr/
│   │   └── engine.js        # QR/QRIS engine
│   ├── utils/
│   └── index.js             # API server
├── tests/               # Unit tests
├── install.sh           # Linux/macOS installer
├── install.cmd          # Windows installer (CMD)
├── install.bat          # Windows installer (BAT)
└── package.json
```

## 🎤 STT Engine (Speech-to-Text)

### Available Models

| Model | Size | Bahasa | Engine | Akurasi |
|-------|------|--------|--------|---------|
| WHISPER_TINY | 39MB | Multi | QVAC | ⭐⭐ |
| WHISPER_BASE | 74MB | Multi | QVAC | ⭐⭐⭐ |
| WHISPER_SMALL | 244MB | Multi | QVAC | ⭐⭐⭐⭐ |
| whisper-tiny | 75MB | Multi | Transformers | ⭐⭐ |

### Penggunaan dengan @qvac/sdk

```javascript
import { QVACSTTEngine } from './src/stt/qvac-engine.js';

const stt = new QVACSTTEngine({ language: 'id' });
await stt.loadModel('WHISPER_TINY');

// Transcribe audio file
const result = await stt.transcribe('./audio.wav');
console.log(result.text); // "transfer 250 ribu ke Andi"

// Parse Indonesian voice command
const intent = stt.parseIntent(result.text);
console.log(intent);
// { intent: 'transfer', params: { amount: 250000, recipient: 'Andi' } }

// Cleanup
await stt.unload();
```

### Voice Commands (Bahasa Indonesia)

| Command | Intent | Example |
|---------|--------|---------|
| Transfer | `transfer` | "transfer 250 ribu ke Andi" |
| Kirim | `transfer` | "kirim 1.5 juta ke Budi" |
| Terima | `receive` | "terima 500 ribu" |
| Tarik | `withdraw` | "tarik 2 juta ke BCA" |
| Cek Saldo | `check_balance` | "cek saldo" |
| Buat QR | `generate_qr` | "buat QRIS 100 ribu" |

## 📱 QR Engine

### Features
- ✅ Generate QRIS Dinamis (amount specific)
- ✅ Generate QRIS Statis (no amount)
- ✅ Scan/Decode QR dari gambar
- ✅ EMV-CRC16 compliant (Bank Indonesia standard)

### Penggunaan

```javascript
import { QREngine } from './src/qr/engine.js';

const qr = new QREngine();

// Generate QRIS
const qris = await qr.generateQRIS({
  merchantName: 'Toko ABC',
  merchantCity: 'JAKARTA',
  amount: 250000,
  dynamic: true
});

console.log(qris.dataUrl); // Base64 QR image
console.log(qris.qrisData); // EMV QRIS string

// Decode QR from image
const decoded = await qr.decode('./qr-image.png');
console.log(decoded.qris); // Parsed QRIS data
```

## 🔌 API Endpoints

Start server dengan `npm start`, lalu gunakan endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/stt/transcribe` | Transcribe audio file |
| POST | `/api/stt/parse-intent` | Parse voice command |
| POST | `/api/qr/qris` | Generate QRIS code |
| POST | `/api/qr/generate` | Generate generic QR |
| POST | `/api/qr/decode` | Decode QR from image |

## 🧪 Testing

```bash
# Test semua
npm test

# Test STT saja (intent parsing)
npm run test:stt

# Test QR saja
npm run test:qr
```

## ⚙️ Konfigurasi

Edit `config/models.json`:

```json
{
  "stt": {
    "engine": "qvac",           // "qvac" atau "transformers"
    "language": "id",           // Default: Indonesian
    "qvac": {
      "default": "WHISPER_TINY" // Model QVAC
    }
  },
  "offline": {
    "enabled": true             // Selalu true, no cloud!
  }
}
```

## 🔄 Model Download Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    First Run (Online)                       │
├─────────────────────────────────────────────────────────────┤
│  1. npm install                                             │
│  2. npm run download-models                                 │
│     └── Try @qvac/sdk first                                │
│         ├── Success → Model cached in ~/.qvac/             │
│         └── Fail → Fallback to @xenova/transformers        │
│                    └── Model cached in ~/.cache/huggingface│
│  3. Model ready for offline use                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Every Run After (Offline)                  │
├─────────────────────────────────────────────────────────────┤
│  1. npm start                                               │
│  2. Model loaded from local cache                           │
│  3. 100% offline operation - NO INTERNET REQUIRED           │
└─────────────────────────────────────────────────────────────┘
```

## 📄 License

MIT © 2026 PAYO Team

---

**Built with ❤️ for Indonesian merchants. Zero cloud, full privacy.**
