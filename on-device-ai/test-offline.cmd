@echo off
chcp 65001 >nul
echo.
echo ════════════════════════════════════════════════════════════════
echo   PAYO On-Device AI - Offline Test
echo   Test apakah STT dan QR berjalan TANPA internet
echo ════════════════════════════════════════════════════════════════
echo.

echo [INFO] Pastikan Anda sudah menjalankan:
echo        1. install.cmd
echo        2. npm run download-models
echo.
echo [INFO] Sekarang CABUT INTERNET / MATIKAN WIFI
echo.
pause

echo.
echo [TEST] Menjalankan test suite...
echo.

call npm test

if %ERRORLEVEL% equ 0 (
    echo.
    echo ════════════════════════════════════════════════════════════════
    echo   ✓ SUKSES! Semua test berjalan OFFLINE!
    echo   
    echo   Ini membuktikan:
    echo   - STT Engine berjalan tanpa internet
    echo   - QR Engine berjalan tanpa internet
    echo   - Intent parsing berjalan tanpa internet
    echo ════════════════════════════════════════════════════════════════
) else (
    echo.
    echo ════════════════════════════════════════════════════════════════
    echo   ✗ Ada test yang gagal
    echo   
    echo   Kemungkinan penyebab:
    echo   - Model belum ter-download (jalankan npm run download-models dulu)
    echo   - Node.js version < 20
    echo ════════════════════════════════════════════════════════════════
)

echo.
pause
