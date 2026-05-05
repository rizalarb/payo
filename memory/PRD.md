# PAYO — Tether-based Offline Payment App (PRD)

## Overview
PAYO adalah aplikasi mobile pembayaran berbasis Tether (USDT) untuk merchant event/konser di Indonesia. Aplikasi ini terinspirasi dari layout merchant dashboard (Milea Concert) dan menyatukan penerimaan QRIS, transfer USDT, dan pemindaian QRIS dalam satu antarmuka.

## Tech Stack
- **Frontend**: Expo (SDK 54) + expo-router, lucide-react-native, react-native-svg, react-native-qrcode-svg, expo-camera
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB (auto-seeded 20 sample transactions)
- **External**: CoinGecko (USDT→IDR conversion, with fallback rate 16250)

## Implemented Features
1. **Dashboard**
   - Custom PAYO logo (top-left, SVG outline)
   - Welcome card + event/location (Milea Concert, Cengkareng)
   - "Pendapatan Hari Ini" card (default USDT, tap to toggle to IDR)
   - 2 receive buttons (Input Nominal QRIS dinamis, Tampilkan QRIS statis)
   - Tarik Pendapatan row → Transfer screen
   - Scan QRIS CTA
   - Latest 5 transactions list
   - Pull-to-refresh + scrollable

2. **Detail Transaksi (`/transaction-detail`)**: paginated list (5/page) with prev/next controls.
3. **Semua Transaksi (`/all-transactions`)**: infinite scroll list of all transactions.
4. **Transfer (`/transfer`)**: 5 latest recipients (tap to autofill) + manual address/amount/note form → POST `/api/transfer`.
5. **Input Manual / QRIS Dinamis (`/input-manual`)**: amount + currency (IDR/USDT) + note → generates QR code (15-min expiry).
6. **QRIS Statis (`/static-qris`)**: bottom-sheet overlay with merchant QR (Milea Concert · PAYO00012345).
7. **Scan QRIS (`/scan-qris`)**: native camera permission flow + scanner overlay; web fallback message.
8. **Bottom Tabs**: Dashboard / Pendapatan (all transactions) / Settings.

## Backend Endpoints (all `/api`)
- `GET /dashboard/today` → totals + USDT/IDR rate
- `GET /exchange-rate` → cached CoinGecko USDT→IDR
- `GET /transactions/recent?limit=N`
- `GET /transactions?page=&limit=`
- `GET /recent-recipients`
- `POST /transfer` `{address, amount, note}`
- `POST /qris/generate` `{amount, currency, note}`
- `GET /qris/static`

## Mocks / Future Enhancements
- USDT/Tron transactions are MOCKED (no real TronWeb sync).
- CoinGecko falls back to fixed rate 16250 IDR/USDT if external API unavailable.
- QVAC SDK OCR/STT integration is PLANNED (not in this iteration).
- Real Tron testnet sync is PLANNED (would require user wallet credentials).

## Color & Iconography
- Primary teal `#2EBFA5`, primary text `#00B392`, light bg `#F5FFFB`.
- All icons use **lucide-react-native** (outline, consistent stroke).
