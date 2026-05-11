# Contributing to PAYO

Terima kasih atas minat Anda untuk berkontribusi ke PAYO! 🎉

## 📋 Cara Berkontribusi

### 1. Fork & Clone

```bash
# Fork repo di GitHub, lalu clone
git clone https://github.com/YOUR_USERNAME/payo.git
cd payo
```

### 2. Buat Branch

```bash
# Untuk fitur baru
git checkout -b feature/nama-fitur

# Untuk bug fix
git checkout -b fix/nama-bug

# Untuk dokumentasi
git checkout -b docs/nama-dokumen
```

### 3. Lakukan Perubahan

- Ikuti coding style yang ada
- Tulis commit message yang jelas
- Tambahkan tests jika perlu
- Update dokumentasi jika perlu

### 4. Commit

Gunakan format commit message:

```
type(scope): description

[optional body]
```

Contoh:
- `feat(stt): add Indonesian language support`
- `fix(qr): fix CRC16 calculation bug`
- `docs(readme): update installation guide`

Types:
- `feat` - Fitur baru
- `fix` - Bug fix
- `docs` - Dokumentasi
- `style` - Formatting (no code change)
- `refactor` - Refactoring
- `test` - Testing
- `chore` - Maintenance

### 5. Push & Pull Request

```bash
git push origin feature/nama-fitur
```

Lalu buat Pull Request di GitHub.

## 🧪 Testing

```bash
# Test On-Device AI
cd on-device-ai && npm test

# Test Backend
cd backend && pytest tests/

# Test Frontend
cd frontend && npm test
```

## 📝 Code Style

### JavaScript/TypeScript
- Gunakan ESLint config yang ada
- Prefer `const` over `let`
- Use async/await over callbacks

### Python
- Follow PEP 8
- Use type hints
- Document functions with docstrings

## 🐛 Reporting Bugs

1. Cek apakah bug sudah dilaporkan di Issues
2. Jika belum, buat Issue baru dengan:
   - Deskripsi bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshot/logs jika ada

## 💡 Feature Requests

1. Cek apakah fitur sudah diminta di Issues
2. Jika belum, buat Issue baru dengan label `enhancement`
3. Jelaskan use case dan benefit fitur tersebut

## 📄 License

Dengan berkontribusi, Anda setuju bahwa kontribusi Anda akan di-license di bawah MIT License.

---

Terima kasih telah berkontribusi! 🙏
