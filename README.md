# PAYO - Point of Sales dengan On-Device AI

<p align="center">
  <img src="docs/assets/payo-logo.png" alt="PAYO Logo" width="200" />
</p>

<p align="center">
  <strong>🇮🇩 Aplikasi POS Cerdas untuk Indonesia</strong><br/>
  QR Payment • Voice Command • OCR Receipt • 100% Offline AI
</p>

<p align="center">
  <a href="#-fitur-utama">Fitur</a> •
  <a href="#-arsitektur">Arsitektur</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-dokumentasi">Dokumentasi</a> •
  <a href="#-kontribusi">Kontribusi</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Windows-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/AI-100%25%20Offline-green" alt="AI Offline" />
  <img src="https://img.shields.io/badge/Node.js-v20%2B-brightgreen" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
</p>

---

## 🎯 Tentang PAYO

**PAYO** adalah aplikasi Point of Sales (POS) yang dirancang khusus untuk merchant Indonesia dengan fokus pada:

- **🔒 Zero Cloud** - Semua AI berjalan di device, data tidak pernah keluar
- **📱 QR Payment** - QRIS compliant (Bank Indonesia standard)
- **🎤 Voice Command** - Transaksi dengan suara Bahasa Indonesia
- **📄 OCR Receipt** - Scan struk dan kartu identitas offline
- **🌐 Offline First** - Tetap berfungsi tanpa internet

## ✨ Fitur Utama

### 1. 📱 QR Engine (QRIS Compliant)
- Generate QR Dinamis & Statis
- Scan & decode QR dari gambar
- EMV-CRC16 compliant sesuai standar Bank Indonesia
- Mendukung semua bank & e-wallet Indonesia

### 2. 🎤 Voice Engine (Speech-to-Text)
- Perintah suara Bahasa Indonesia
- "Transfer 250 ribu ke Andi"
- "Buat QRIS 100 ribu"
- "Cek saldo"
- Powered by Whisper ONNX (100% offline)

### 3. 📄 OCR Engine (Coming Soon)
- Scan struk/receipt
- Scan KTP/identitas
- PaddleOCR mobile int8

### 4. 💾 Offline Storage
- Transaksi tersimpan lokal
- Sync otomatis saat online
- SQLite/WatermelonDB

## 🏗 Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                      PAYO Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Backend    │  │  On-Device   │      │
│  │  (Expo/RN)   │  │  (FastAPI)   │  │     AI       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         │    REST API     │                 │               │
│         ├────────────────►│                 │               │
│         │                 │                 │               │
│         │   Voice/QR      │                 │               │
│         ├─────────────────┼────────────────►│               │
│         │                 │                 │               │
│         │                 │    MongoDB      │               │
│         │                 ├────────────────►│               │
│         │                 │                 │               │
│  └──────┴─────────────────┴─────────────────┴───────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │              On-Device AI Stack                   │      │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │      │
│  │  │  QVAC   │  │ Whisper │  │  QR/    │          │      │
│  │  │   SDK   │  │  ONNX   │  │  QRIS   │          │      │
│  │  └─────────┘  └─────────┘  └─────────┘          │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Struktur Repository

```
payo/
├── 📱 frontend/              # Mobile App (Expo/React Native)
│   ├── app/                  # Screens (file-based routing)
│   ├── src/                  # Components, API, Theme
│   └── package.json
│
├── 🖥️ backend/               # API Server (FastAPI/Python)
│   ├── server.py             # Main API endpoints
│   ├── tests/                # Unit tests
│   └── requirements.txt
│
├── 🤖 on-device-ai/          # On-Device AI Engine (Node.js)
│   ├── src/
│   │   ├── stt/              # Speech-to-Text (Whisper/QVAC)
│   │   └── qr/               # QR/QRIS Engine
│   ├── scripts/              # Setup & download scripts
│   ├── install.cmd           # Windows installer
│   └── install.sh            # Linux/macOS installer
│
├── 🌐 docs/                  # GitHub Pages (Landing Page)
│   ├── index.html
│   ├── styles.css
│   └── script.js
│
├── 📄 landing-page/          # Source landing page
│
└── 📋 PAYO_BACKEND_AUDIT.md  # Architecture documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- Python 3.11+
- MongoDB (untuk backend)

### 1. Clone Repository
```bash
git clone https://github.com/rizalarb/payo.git
cd payo
```

### 2. Setup On-Device AI (Windows)
```cmd
cd on-device-ai
install.cmd
```

### 2. Setup On-Device AI (Linux/macOS)
```bash
cd on-device-ai
chmod +x install.sh
./install.sh
```

### 3. Setup Backend
```bash
cd backend
pip install -r requirements.txt
python server.py
```

### 4. Setup Frontend
```bash
cd frontend
npm install
npx expo start
```

## 📖 Dokumentasi

| Dokumen | Deskripsi |
|---------|-----------|
| [On-Device AI README](on-device-ai/README.md) | Setup & penggunaan AI engine |
| [Backend Audit](PAYO_BACKEND_AUDIT.md) | Analisis arsitektur backend |
| [Frontend README](frontend/README.md) | Setup mobile app |
| [Landing Page](docs/README.md) | Marketing website |

## 🔧 Teknologi

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: Expo Router (file-based)
- **State**: React Context / Zustand

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: PIN-based security

### On-Device AI
- **STT Engine**: @qvac/sdk + @xenova/transformers
- **Models**: Whisper ONNX (tiny/base/small)
- **QR Engine**: qrcode + jsQR
- **Runtime**: Node.js v20+

## 🌐 Live Demo

- **Landing Page**: [https://rizalarb.github.io/payo/](https://rizalarb.github.io/payo/)
- **Mobile App**: Coming soon (Expo Go)

## 🔒 Privacy & Security

PAYO didesain dengan prinsip **Privacy First**:

- ✅ **Zero Cloud AI** - Semua inferensi di device
- ✅ **No Data Leakage** - Data tidak dikirim ke server eksternal
- ✅ **UU PDP Compliant** - Sesuai regulasi perlindungan data Indonesia
- ✅ **Offline Capable** - Berfungsi tanpa internet

## 🤝 Kontribusi

Kami menyambut kontribusi! Silakan:

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Kontak

- **Website**: [https://rizalarb.github.io/payo/](https://rizalarb.github.io/payo/)
- **GitHub**: [@rizalarb](https://github.com/rizalarb)

---

<p align="center">
  <strong>Built with ❤️ for Indonesian Merchants</strong><br/>
  <em>Zero Cloud • Full Privacy • 100% Offline AI</em>
</p>
