# PAYO On-Device AI Engine

> 🎤 STT (Speech-to-Text) + 📱 QR Code Engine — 100% Offline, Zero Cloud

## 📋 Requirements

- **Node.js**: v20.0.0 atau lebih tinggi
- **RAM**: Minimal 4GB (disarankan 8GB)
- **Storage**: ~500MB untuk model
- **OS**: Windows 10/11, macOS, Linux

## 🚀 Quick Start

### Windows
```cmd
.\install.cmd
```

### Linux/macOS
```bash
chmod +x install.sh
./install.sh
```

## 📁 Struktur Direktori

```
on-device-ai/
├── config/              # Konfigurasi
│   └── models.json      # Daftar model & versi
├── models/              # Model ONNX (offline)
│   ├── stt/             # Whisper ONNX models
│   └── qr/              # QR processing assets
├── scripts/             # Script instalasi & download
│   ├── download-models.js
│   └── verify-setup.js
├── src/                 # Source code
│   ├── stt/             # Speech-to-Text engine
│   ├── qr/              # QR Code engine
│   ├── utils/           # Utilities
│   └── index.js         # Entry point
├── tests/               # Unit tests
├── install.sh           # Linux/macOS installer
├── install.cmd          # Windows installer (CMD)
├── install.bat          # Windows installer (BAT)
└── package.json
```

## 🎤 STT Engine (Speech-to-Text)

### Model yang Didukung

| Model | Size | Bahasa | Akurasi | Kecepatan |
|-------|------|--------|---------|------------|
| whisper-tiny | 75MB | Multi | ⭐⭐ | ⚡⚡⚡ |
| whisper-base | 142MB | Multi | ⭐⭐⭐ | ⚡⚡ |
| whisper-small | 244MB | Multi | ⭐⭐⭐⭐ | ⚡ |

### Penggunaan

```javascript
import { STTEngine } from './src/stt/engine.js';

const stt = new STTEngine();
await stt.loadModel('whisper-tiny');

const result = await stt.transcribe('./audio.wav', {
  language: 'id' // Bahasa Indonesia
});

console.log(result.text); // "transfer 250 ribu ke Andi"
```

## 📱 QR Engine

### Fitur
- ✅ Generate QRIS Dinamis
- ✅ Generate QRIS Statis
- ✅ Scan/Decode QR dari gambar
- ✅ EMV-CRC16 compliant

### Penggunaan

```javascript
import { QREngine } from './src/qr/engine.js';

const qr = new QREngine();

// Generate QRIS
const qrisData = qr.generateQRIS({
  merchantName: 'Toko ABC',
  amount: 250000,
  dynamic: true
});

// Decode QR
const decoded = await qr.decode('./qr-image.png');
console.log(decoded);
```

## ⚙️ Konfigurasi

Edit `config/models.json` untuk mengubah model default:

```json
{
  "stt": {
    "default": "whisper-tiny",
    "language": "id"
  },
  "qr": {
    "format": "qris",
    "errorCorrection": "M"
  }
}
```

## 🧪 Testing

```bash
# Test semua
npm test

# Test STT saja
npm run test:stt

# Test QR saja
npm run test:qr
```

## 🔒 Privacy

- ✅ **100% Offline** - Tidak ada data yang dikirim ke server
- ✅ **On-Device Processing** - Semua inferensi di lokal
- ✅ **No Cloud APIs** - Tidak butuh internet setelah setup
- ✅ **UU PDP Ready** - Data tidak pernah keluar device

## 📄 License

MIT © 2026 PAYO Team
