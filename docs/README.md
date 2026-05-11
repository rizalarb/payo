# PAYO Landing Page - GitHub Pages

> Marketing website for PAYO - On-Device AI Point of Sale

## 🌐 Live URL

**GitHub Pages:** https://rizalarb.github.io/payo/

**Custom Domain (if configured):** https://payo.app (or your domain)

---

## 📁 Files

- `index.html` - Main landing page (English)
- `styles.css` - Dark theme styling with teal/cyan gradient
- `script.js` - Interactivity (nav, reveal animations, form)
- `assets/payo-logo.png` - PAYO logo

---

## 🚀 Deploy to GitHub Pages

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Update landing page"
git push origin main
```

### Step 2: Enable GitHub Pages
1. Go to repository **Settings**
2. Navigate to **Pages** (left sidebar)
3. Under **Source**, select:
   - **Deploy from a branch**
   - Branch: `main`
   - Folder: `/docs`
4. Click **Save**
5. Wait 2-5 minutes for deployment

---

## 🌍 Custom Domain Setup

### Option A: Subdomain (e.g., www.payo.app)

1. **Create CNAME file** in `/docs/`:
   ```
   www.payo.app
   ```

2. **Add DNS record** at your domain registrar:
   ```
   Type: CNAME
   Name: www
   Value: rizalarb.github.io
   ```

3. **Enable in GitHub Pages Settings:**
   - Custom domain: `www.payo.app`
   - ✅ Enforce HTTPS

### Option B: Apex Domain (e.g., payo.app)

1. **Create CNAME file** in `/docs/`:
   ```
   payo.app
   ```

2. **Add DNS A records** at your domain registrar:
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

3. **Enable in GitHub Pages Settings:**
   - Custom domain: `payo.app`
   - ✅ Enforce HTTPS

### DNS Propagation

After adding DNS records, wait 24-48 hours for full propagation.

Check status: https://www.whatsmydns.net/

---

## 🔧 Development

### Local Preview
```bash
cd docs
python3 -m http.server 8080
# Open http://localhost:8080
```

### Edit Content
- **Text content:** Edit `index.html`
- **Styling:** Edit `styles.css`
- **Interactivity:** Edit `script.js`

---

## 📝 SEO & Social

The landing page includes:
- ✅ Meta description & keywords
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Card tags
- ✅ Favicon
- ✅ Mobile responsive design

---

## 📄 License

MIT © 2026 PAYO Team
