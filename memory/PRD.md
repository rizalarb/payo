# PAYO — Tether-based Offline Payment App (PRD)

## Overview
PAYO adalah aplikasi mobile pembayaran berbasis Tether (USDT) untuk merchant event/konser di Indonesia. Mendukung penerimaan QRIS dinamis & statis, transfer USDT TRC20, withdraw ke bank lokal, dan **perintah suara** untuk transfer/withdraw.

## Tech Stack
- **Frontend**: Expo SDK 54 + expo-router + lucide-react-native + react-native-svg + react-native-qrcode-svg + expo-camera + expo-av
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB (auto-seeded 20 sample transactions)
- **AI**: Whisper-1 (STT) + GPT-4o-mini (intent parse) via Emergent LLM key
- **External**: CoinGecko (USDT→IDR conversion, fallback 16250)

## Implemented Features
### Dashboard
- New PAYO logo (Tether-coin style SVG, top-left)
- Welcome card · Milea Concert · Cengkareng
- Today income card (toggle USDT ↔ IDR)
- **2×2 button grid**: Transfer · Scan QRIS · Input Nominal QRIS · Open QRIS
- "Tarik Pendapatan QRIS Sekarang" row → Withdraw screen
- Latest 5 transactions, scrollable, pull-to-refresh
- **Open QRIS** opens bottom-sheet overlay on same page

### Transfer Screen (USDT TRC20)
- 5 latest recipients (autofill on tap)
- Manual address/amount/note form
- **Voice mic button** (Whisper STT + GPT-4o-mini intent parse). Web fallback: text input.
- Elegant animated SuccessModal on success

### Withdraw Screen (Bank IDR — DIFFERENT from Transfer)
- 6 bank chips: BCA, Mandiri, BRI, BNI, CIMB, Permata
- Account number, holder name, amount IDR (min Rp50.000)
- Quick-amount chips (100k/250k/500k/1M)
- Live fee preview (0.5% admin)
- **Voice mic button** (same STT pipeline)
- SuccessModal showing net IDR + estimated arrival time

### Pendapatan Tab
- Daily aggregate cards (date, total USDT, total IDR, tx count)
- Tap card → day detail screen with summary + paginated tx list (5/page, prev/next)

### Settings Tab
- Wallet, Notifications, Security, Language, Help, Logout (UI only)

### Other Screens
- `/transaction-detail` — paginated detail with prev/next
- `/all-transactions` — infinite scroll
- `/input-manual` — generate dynamic QRIS (15-min expiry)
- `/scan-qris` — native camera permission flow + scanner overlay; web fallback message

## Backend Endpoints (`/api`)
- `GET /dashboard/today`
- `GET /exchange-rate` (CoinGecko cached)
- `GET /transactions/recent?limit=N`
- `GET /transactions?page=&limit=&date=YYYY-MM-DD`
- `GET /transactions/daily-summary?days=N`
- `GET /recent-recipients`
- `GET /banks`
- `POST /transfer` `{address, amount, note}`
- `POST /withdraw` `{bank_code, account_number, account_holder, amount_idr, note}`
- `POST /qris/generate` `{amount, currency, note}`
- `GET /qris/static`
- `POST /voice/parse` (multipart `audio` file → Whisper-1 + GPT-4o-mini intent)
- `POST /voice/parse-text` (form `text` → GPT-4o-mini intent, web fallback)

## Mocks / Future Enhancements
- USDT/Tron transactions are MOCKED (DB seed) — no real TronWeb sync
- Withdraw is SIMULATED — no real bank API integration
- CoinGecko fallback rate 16250 if external API down
- OCR (struk receipt) — planned next iteration
- QVAC SDK local AI — replaced by cloud Whisper+GPT for now

## Tests
- **Backend pytest**: 20/20 PASS (`/app/backend/tests/test_payo_api.py`)
- **Frontend**: all critical flows verified by testing agent (iteration_2)
