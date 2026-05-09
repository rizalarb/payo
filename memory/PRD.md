# PAYO — Tether-based Offline Payment App (PRD)

## Overview
PAYO adalah aplikasi mobile pembayaran berbasis Tether (USDT) untuk merchant event/konser di Indonesia. Mendukung penerimaan QRIS dinamis & statis, transfer USDT TRC20, withdraw ke bank lokal, perintah suara real-time (auto-VAD), PIN keamanan transaksi (bcrypt + lockout), QR scan → auto-transfer, OCR struk → auto-transfer, dan **QVAC offline AI engine** (hybrid: offline saat native build, cloud fallback saat web preview).

## Tech Stack
- **Frontend**: Expo SDK 54 + expo-router + lucide-react-native + react-native-svg + react-native-qrcode-svg + expo-camera + expo-av + **@qvac/sdk**
- **Backend**: FastAPI (Python) + Motor (async MongoDB) + bcrypt + emergentintegrations (Whisper-1, GPT-4o-mini, GPT-4o vision)
- **Database**: MongoDB
- **External**: CoinGecko (USDT→IDR fallback 16250)

## QVAC Hybrid AI (`/app/frontend/src/services/qvac.ts`)
- `initQvac()` di startup: lazy-loads `@qvac/sdk` via indirect eval-require sehingga Metro tidak men-statik-resolve native modul di web bundling.
- Native build: load Llama-3.2-1B-Q4 (LLM), Whisper-Tiny (STT), Moondream2-Q4/LLaVA (Vision OCR) sepenuhnya **offline P2P**.
- Web preview / SDK gagal: **cloud fallback** otomatis ke `/api/voice/parse` (Whisper-1) + `/api/voice/parse-text` (GPT-4o-mini) + `/api/ocr/extract` (GPT-4o vision).
- Settings → "QVAC AI Engine" badge: `OFFLINE` (hijau) saat QVAC aktif, `CLOUD` (warning) saat fallback.

## Implemented Features (Iter 1–4)
### Dashboard
- Logo PNG (asset uploaded user) di top-left
- Welcome + event/location card
- Today income card (toggle USDT ↔ IDR)
- 2×2 button grid: **Transfer · Scan QRIS · Input Nominal QRIS · Open QRIS**
- "Tarik Pendapatan QRIS Sekarang" → Withdraw screen
- Latest 5 transactions, scrollable
- Open QRIS = **full-screen Modal overlay** (statusBarTranslucent) — dashboard tidak terlihat di belakang

### Transfer (USDT TRC20)
- 5 latest recipients autofill
- Manual address/amount/note + URL param prefill (`/transfer?address=…&amount=…&from=scan`)
- Voice mic real-time VAD (auto-stop saat hening)
- **PIN gate** sebelum submit
- SuccessModal cantik (confetti, ring, gradient backdrop)

### Withdraw (Bank IDR — distinct dari Transfer)
- 6 banks (BCA/Mandiri/BRI/BNI/CIMB/Permata) + nominal IDR + fee preview 0.5%
- Voice mic + PIN gate + SuccessModal

### Pendapatan Tab — daily aggregate cards + day detail w/ pagination

### Scan QRIS / OCR Struk (`/scan-qris`)
- Mode toggle: **QR / OCR Struk**
- QR mode: scan → detect TRC20 address regex → navigate `/transfer?address=…&amount=…&from=scan`
- OCR mode: takePictureAsync → `ocrFromImage()` (QVAC vision atau GPT-4o vision cloud) → extract addresses + amounts → navigate to /transfer
- Camera permission native popup; web fallback dengan 2 demo button
- AI badge "QVAC Offline" / "Cloud Fallback" di overlay

### Settings
- **AI Engine card** (top) showing QVAC offline/cloud status
- "Keamanan PIN" → `/setup-pin` (create + confirm)
- Wallet, Notifications, Language, Help, Logout

## Backend Endpoints (`/api`)
- `GET /dashboard/today` · `GET /exchange-rate`
- `GET /transactions/recent` · `/transactions?page=&limit=&date=YYYY-MM-DD`
- `GET /transactions/daily-summary?days=N`
- `GET /recent-recipients` · `GET /banks`
- `POST /transfer` · `POST /withdraw`
- `POST /qris/generate` · `GET /qris/static`
- `POST /voice/parse` (audio→Whisper) · `POST /voice/parse-text`
- `POST /ocr/extract` (base64 image → GPT-4o vision; invalid image → 400)
- `GET /pin/status` · `POST /pin/create` · `POST /pin/verify` (bcrypt + lockout)

## Tests
- Backend pytest **33/33 PASS** (10 PIN + 20 PAYO + 3 OCR)
- Frontend re-validated by testing agent — all critical flows green

## Mocks / Future
- USDT/Tron tx MOCKED — TronWeb not connected
- Withdraw SIMULATED — no real bank API
- QVAC offline AI is **CLOUD FALLBACK on web preview** (true on-device AI when EAS-built native)
- OCR cloud fallback uses GPT-4o vision (Emergent LLM key)
