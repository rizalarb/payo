# PAYO — Tether-based Offline Payment App (PRD)

## Overview
PAYO adalah aplikasi mobile pembayaran berbasis Tether (USDT) untuk merchant event/konser di Indonesia. Mendukung penerimaan QRIS dinamis & statis, transfer USDT TRC20, withdraw ke bank lokal, perintah suara real-time (auto-VAD), dan PIN keamanan transaksi (bcrypt + lockout).

## Tech Stack
- **Frontend**: Expo SDK 54 + expo-router + lucide-react-native + react-native-svg + react-native-qrcode-svg + expo-camera + expo-av
- **Backend**: FastAPI (Python) + Motor (async MongoDB) + bcrypt
- **Database**: MongoDB (auto-seeded 20 sample tx + `pins` collection)
- **AI**: Whisper-1 (STT) + GPT-4o-mini (intent parse) via Emergent LLM key
- **External**: CoinGecko (USDT→IDR fallback 16250)

## Implemented Features (Iter 1–3)
### Dashboard
- Tether-coin SVG logo (top-left)
- Welcome + event/location card
- Today income card (toggle USDT ↔ IDR)
- 2×2 button grid: **Transfer · Scan QRIS · Input Nominal QRIS · Open QRIS**
- "Tarik Pendapatan QRIS Sekarang" row → Withdraw screen
- Latest 5 transactions, scrollable, pull-to-refresh
- **Open QRIS** = bottom-sheet overlay on same dashboard

### Transfer (USDT TRC20)
- 5 latest recipients autofill
- Manual address/amount/note form
- **Voice mic with real-time VAD** (auto-stops on silence ≥1.4s, no manual pause)
- **PIN gate** (bcrypt-hashed 6-digit) before submit
- Beautified animated SuccessModal (confetti + ring + gradient bg + amount)

### Withdraw (Bank IDR — distinct from Transfer)
- 6 banks: BCA/Mandiri/BRI/BNI/CIMB/Permata
- Account no, holder, amount IDR, quick chips, fee preview (0.5%)
- Voice mic + auto-VAD, PIN gate, SuccessModal

### Pendapatan Tab
- Daily aggregate cards (date, USDT, IDR, count)
- Tap → day-detail with summary + paginated tx list

### Settings
- "Keamanan PIN" → `/setup-pin` (create + confirm flow)
- One-way bcrypt hashing; max 5 attempts → 15-min lockout

### Other Screens
- `/transaction-detail` paginated, `/all-transactions` infinite scroll
- `/input-manual` dynamic QRIS, `/scan-qris` native camera permission
- `/setup-pin` numeric keypad with shake on mismatch

## Backend Endpoints (`/api`)
- `GET /dashboard/today` · `GET /exchange-rate`
- `GET /transactions/recent`, `/transactions?page=&limit=&date=YYYY-MM-DD`
- `GET /transactions/daily-summary?days=N`
- `GET /recent-recipients` · `GET /banks`
- `POST /transfer` · `POST /withdraw`
- `POST /qris/generate` · `GET /qris/static`
- `POST /voice/parse` (multipart audio → Whisper) · `POST /voice/parse-text`
- `GET /pin/status` · `POST /pin/create` (with confirm) · `POST /pin/verify`

## Security
- **PIN bcrypt** (12 rounds), atomic failed-attempt counter, 15-min lockout after 5 fails
- PIN never returned by status; only `is_set`/`is_locked`/`failed_attempts`/`time_until_unlock`
- Single-device merchant model (`device_id="default-device"` default)

## Mocks / Future
- USDT/Tron tx MOCKED (DB seed) — TronWeb not connected
- Withdraw SIMULATED — no real bank API
- CoinGecko fallback if external down
- OCR (struk receipt) — planned next iter
- Voice mic VAD only on native (expo-av metering); web uses text fallback

## Tests
- Backend pytest **30/30 PASS** (PIN 10 + PAYO 20)
- Frontend re-tested by testing agent — all critical flows verified
