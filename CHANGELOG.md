# Changelog

Semua perubahan penting pada project ini akan didokumentasikan di file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-11

### Added

#### On-Device AI Engine
- ✨ Speech-to-Text (STT) engine dengan @qvac/sdk
- ✨ Fallback ke @xenova/transformers jika QVAC tidak tersedia
- ✨ QR/QRIS engine dengan EMV-CRC16 compliance
- ✨ Intent parsing untuk voice commands Bahasa Indonesia
- ✨ Amount parsing ("250 ribu", "1.5 juta", dll)
- ✨ Windows installer (install.cmd, install.bat)
- ✨ Linux/macOS installer (install.sh)
- ✨ Offline test script (test-offline.cmd)

#### Landing Page
- ✨ Marketing landing page dengan design modern
- ✨ Responsive design (mobile-first)
- ✨ Early access waitlist form
- ✨ SEO meta tags & Open Graph
- ✨ GitHub Pages deployment ready

#### Documentation
- 📝 README utama dengan arsitektur diagram
- 📝 README per direktori (frontend, backend, on-device-ai, docs)
- 📝 PAYO_BACKEND_AUDIT.md (architecture analysis)
- 📝 CONTRIBUTING.md
- 📝 LICENSE (MIT)

### Technical Details

#### STT Models Supported
| Model | Size | Engine |
|-------|------|--------|
| WHISPER_TINY | 39MB | QVAC |
| WHISPER_BASE | 74MB | QVAC |
| whisper-tiny | 75MB | Transformers |

#### Voice Commands (Indonesian)
- "transfer 250 ribu ke Andi" → `{ intent: 'transfer', amount: 250000, recipient: 'Andi' }`
- "terima 500 ribu" → `{ intent: 'receive', amount: 500000 }`
- "cek saldo" → `{ intent: 'check_balance' }`
- "buat QRIS 100 ribu" → `{ intent: 'generate_qr', amount: 100000 }`

#### QR/QRIS Features
- Generate QRIS Dinamis & Statis
- EMV-CRC16-CCITT-FALSE checksum
- Bank Indonesia QRIS standard compliant
- Scan/decode from image file

---

## [Unreleased]

### Planned
- [ ] OCR Engine (PaddleOCR integration)
- [ ] Offline storage dengan SQLite/WatermelonDB
- [ ] React Native mobile app completion
- [ ] Real audio transcription testing
- [ ] Custom domain untuk landing page
