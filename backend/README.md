# PAYO Backend API

> 🖥️ FastAPI Backend untuk aplikasi PAYO POS

## 📋 Overview

Backend ini menyediakan REST API untuk:
- Manajemen transaksi
- Autentikasi PIN
- Integrasi dengan On-Device AI
- Sync data offline

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- MongoDB

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Run server
python server.py
```

Server akan berjalan di `http://localhost:8001`

## 📁 Struktur

```
backend/
├── server.py           # Main API server
├── requirements.txt    # Python dependencies
├── .env               # Environment variables
└── tests/             # Unit tests
    ├── test_payo_api.py
    └── test_pin_security.py
```

## 🔌 API Endpoints

### Health Check
```
GET /api/health
```

### Transactions
```
GET    /api/transactions          # List all transactions
POST   /api/transactions          # Create transaction
GET    /api/transactions/:id      # Get transaction detail
```

### PIN Security
```
POST   /api/pin/setup             # Setup PIN
POST   /api/pin/verify            # Verify PIN
```

### QR/QRIS
```
POST   /api/qris/generate         # Generate QRIS
POST   /api/qris/decode           # Decode QRIS image
```

## ⚙️ Environment Variables

```env
MONGO_URL=mongodb://localhost:27017/payo
PORT=8001
SECRET_KEY=your-secret-key
```

## 🧪 Testing

```bash
# Run all tests
pytest tests/

# Run specific test
pytest tests/test_payo_api.py -v
```

## 📄 License

MIT © PAYO Team
