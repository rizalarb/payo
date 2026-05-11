# PAYO — Marketing Landing Page

Landing page marketing untuk **PAYO** — POS pembayaran cerdas dengan QR + perintah suara, AI 100% on-device.

Dibuat dengan **HTML + CSS + JS murni** — tanpa build step, tanpa framework, tanpa dependencies. Bisa langsung di-deploy ke GitHub Pages, Vercel, Netlify, Cloudflare Pages, atau bucket S3 manapun.

## Struktur

```
landing-page/
├── index.html      # Struktur halaman (single page, ~12 section)
├── styles.css      # Semua styling (CSS variables, responsive, dark sections)
├── script.js       # Sticky nav, mobile menu, reveal animations, FAQ accordion
└── README.md       # File ini
```

## Section yang tersedia

1. **Navbar** — sticky, glassmorphism, mobile-responsive dengan hamburger
2. **Hero** — headline, subheadline, dual CTA, phone mockup interaktif, floating chips, meta stats
3. **Trust strip** — 6 bank yang didukung
4. **Pain points** — kolom komparasi POS Cloud vs PAYO On-Device
5. **Three Pillars** — QR Engine, Voice Engine (highlighted), OCR Engine (roadmap)
6. **On-Device Manifesto** — section gelap dengan tabel komparasi 8 baris + 3 stat besar
7. **How It Works** — 3 step (voice → QR → withdraw)
8. **Stats banner** — 4 angka kunci (6 bank, 0,5%, 15m expiry, <5MB model)
9. **FAQ** — 7 accordion item
10. **CTA section** — download Android/iOS dengan trust signals
11. **Footer** — brand, produk, perusahaan, legal

## Cara menjalankan lokal

Karena tidak ada build step, cukup buka `index.html` langsung:

```bash
# Opsi 1 — buka langsung di browser
open landing-page/index.html

# Opsi 2 — pakai server statis sederhana (recommended)
cd landing-page
python3 -m http.server 8080
# lalu buka http://localhost:8080

# Opsi 3 — Node
npx serve landing-page
```

## Deploy

### GitHub Pages

1. Push folder `landing-page/` ke repo (sudah disertakan).
2. Di GitHub repo → **Settings → Pages**
3. Source: `Deploy from a branch`
4. Branch: `main`, folder: `/landing-page`
5. Klik **Save**. URL akan tersedia di `https://<username>.github.io/payo/`

### Vercel / Netlify

Drag & drop folder `landing-page/` di dashboard, atau:

```bash
# Vercel
vercel --cwd landing-page

# Netlify
netlify deploy --dir=landing-page --prod
```

### Cloudflare Pages

Connect repo → set **Build command:** (kosong) → **Build output directory:** `landing-page`

## Customisasi

### Brand colors

Edit CSS variables di `styles.css` (baris paling atas, dalam `:root`):

```css
:root {
  --primary: #26D0A8;        /* hijau Tether-style */
  --primary-dark: #14A684;
  --bg-dark: #0F2A26;        /* dark green untuk hero/manifesto */
  --accent: #4ADE80;
  /* ... */
}
```

### Konten

Semua copywriting ada langsung di `index.html` dalam Bahasa Indonesia. Cari bagian yang ingin diedit dengan teks anchor (mis. `<h1 class="headline">`).

### Logo

Logo PAYO adalah inline SVG (lingkaran hijau dengan stylized T) di `index.html`. Ada di:
- `.logo-mark` (navbar, ~baris 50)
- `.app-logo` di phone mockup (~baris 130)
- `.logo-footer` (~baris 380)
- favicon di `<head>`

### CTA links

Semua tombol download/CTA saat ini mengarah ke `#cta` atau `#`. Update dengan link Play Store / App Store sebenarnya:

```html
<a href="https://play.google.com/store/apps/details?id=com.payo" data-cta="download-android">
```

## SEO

- ✅ Meta description, keywords, Open Graph, Twitter cards (di `<head>`)
- ✅ Semantic HTML (`<header>`, `<section>`, `<article>`, `<footer>`)
- ✅ Bahasa Indonesia (`lang="id"`, `og:locale=id_ID`)
- ✅ Mobile viewport meta
- ⚠️ Belum ada: `robots.txt`, `sitemap.xml`, structured data (JSON-LD). Tambahkan sebelum production launch.
- ⚠️ Belum ada OG image — buat 1200×630 PNG dan tambahkan `<meta property="og:image" content="..." />`.

## Performa

- 🎯 Single HTML + CSS + JS file = ~25 KB total (sebelum gzip)
- 🎯 Tidak ada library eksternal kecuali Google Fonts (preconnect optimised)
- 🎯 Inline SVG icons (no icon font, no external requests)
- 🎯 IntersectionObserver untuk reveal animations (graceful fallback)
- 🎯 `prefers-reduced-motion` honored

## Aksesibilitas

- ✅ Semantic landmarks
- ✅ `aria-label` pada nav, ikon, dan toggle
- ✅ Focusable buttons & links
- ✅ Color contrast AA pada semua text utama
- ✅ Reduced-motion support

## Browser support

- Chrome / Edge / Safari / Firefox versi terbaru ✅
- Mobile Safari iOS 14+ ✅
- Chrome Android 90+ ✅
- IE 11: tidak didukung (CSS Grid, custom properties, IntersectionObserver)

## Lisensi

Ikuti lisensi repo utama PAYO.

---

Dibuat untuk: **PAYO — POS Pembayaran Cerdas, 100% On-Device** 🇮🇩
