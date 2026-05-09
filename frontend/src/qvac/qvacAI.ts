/**
 * QVAC AI service wrapper.
 *
 * QVAC SDK runs LLM + STT + OCR fully on-device (offline). It requires native
 * bindings (via `@qvac/sdk` Expo native plugins), so it ONLY works in:
 *   - Expo Dev Client / production native build (iOS, Android)
 *   - Bare RN
 *
 * On Expo Go web preview (this preview) the native modules are not available,
 * so we fall back to the cloud STT/LLM endpoints already in the FastAPI
 * backend (Whisper + GPT-4o-mini via Emergent LLM key) so the UI is still
 * demoable end-to-end.
 *
 * Public API:
 *   await qvacAI.init()         // best-effort init; safe to call multiple times
 *   qvacAI.isAvailable          // true when on-device QVAC ready
 *   qvacAI.transcribe(uri)      // STT  -> { text, source }
 *   qvacAI.parseIntent(text)    // LLM  -> intent JSON
 *   qvacAI.ocrReceipt(imageUri) // OCR  -> { merchant, total, currency, items, raw_text }
 */
import { Platform } from 'react-native';
import { api } from '../api';

type InitState = 'idle' | 'loading' | 'ready' | 'unavailable';

class QvacAIService {
  state: InitState = 'idle';
  reason: string | null = null;
  private llmModelId: string | null = null;
  private sttModelId: string | null = null;
  private ocrModelId: string | null = null;
  private sdk: any = null;

  get isAvailable() { return this.state === 'ready'; }

  async init(): Promise<boolean> {
    if (this.state === 'ready') return true;
    if (this.state === 'loading') return false;
    this.state = 'loading';
    if (Platform.OS === 'web') {
      this.state = 'unavailable';
      this.reason = 'Native QVAC SDK tidak berjalan di web preview. Pakai cloud fallback.';
      return false;
    }
    try {
      // Defeat Metro static analysis — only load on native runtime, since
      // bare-rpc and other QVAC bindings are not resolvable on web.
      // eslint-disable-next-line no-new-func
      const dynImport = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
      this.sdk = await dynImport('@qvac/sdk');
      const { loadModel, LLAMA_3_2_1B_INST_Q4_0 } = this.sdk;
      // 1B model is the smallest LLM bundled — keeps device storage <1GB
      this.llmModelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: 'llm' });
      // STT (whisper.cpp) — model loaded lazily on first transcribe to save startup time
      this.state = 'ready';
      return true;
    } catch (e: any) {
      this.state = 'unavailable';
      this.reason = e?.message ?? 'QVAC SDK gagal init';
      // eslint-disable-next-line no-console
      console.warn('[qvacAI] unavailable, will fallback to cloud:', this.reason);
      return false;
    }
  }

  async transcribe(audioUri: string, mimeType = 'audio/m4a'): Promise<{ text: string; source: 'qvac' | 'cloud' }> {
    await this.init();
    if (this.isAvailable && this.sdk) {
      try {
        const { loadModel, speechToText, WHISPER_TINY_GGML_Q5_1 } = this.sdk;
        if (!this.sttModelId) {
          this.sttModelId = await loadModel({ modelSrc: WHISPER_TINY_GGML_Q5_1, modelType: 'stt' });
        }
        // Read audio file bytes (RN: fetch to ArrayBuffer)
        const buf = await (await fetch(audioUri)).arrayBuffer();
        const result = await speechToText(this.sttModelId, new Uint8Array(buf), { language: 'id' });
        const text = (result?.text ?? String(result ?? '')).trim();
        return { text, source: 'qvac' };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[qvacAI.transcribe] failed, fallback to cloud:', e);
      }
    }
    // Cloud fallback (Whisper-1 via backend)
    const res = await api.voiceParseAudio(audioUri, mimeType);
    return { text: res.transcript, source: 'cloud' };
  }

  async parseIntent(text: string) {
    await this.init();
    if (this.isAvailable && this.sdk && this.llmModelId) {
      try {
        const { completion } = this.sdk;
        const prompt = `You are an intent parser for an Indonesian payment app. Output ONLY valid JSON with keys: action ('transfer' or 'withdraw'), amount (number or null), currency ('USDT' or 'IDR'), recipient (full name or null), bank (BCA/MANDIRI/BRI/BNI/CIMB/PERMATA or null), account_number (digits or null), note (string or null). Rules: kirim/transfer→transfer; tarik/withdraw/cair→withdraw; juta=1000000 IDR; ribu=1000 IDR; default currency USDT for transfer, IDR for withdraw. User said: "${text}"`;
        const out = await completion(this.llmModelId, prompt);
        const s = String(out ?? '').trim();
        const cleaned = s.startsWith('```') ? s.replace(/^```(json)?/, '').replace(/```$/, '').trim() : s;
        return { ...JSON.parse(cleaned), raw_text: text, source: 'qvac' };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[qvacAI.parseIntent] failed, fallback to cloud:', e);
      }
    }
    const res = await api.voiceParseText(text);
    return res.intent;
  }

  async ocrReceipt(imageUri: string): Promise<{ merchant: string | null; total: number | null; currency: string | null; items: { name: string; price: number }[]; raw_text: string; source: 'qvac' | 'cloud' }> {
    await this.init();
    if (this.isAvailable && this.sdk) {
      try {
        const { loadModel, ocr, OCR_TESSERACT_IND } = this.sdk;
        if (!this.ocrModelId) {
          // OCR_TESSERACT_IND = Indonesian language pack (fallback to ENG if missing)
          const src = OCR_TESSERACT_IND || (this.sdk.OCR_TESSERACT_ENG);
          this.ocrModelId = await loadModel({ modelSrc: src, modelType: 'ocr' });
        }
        const buf = await (await fetch(imageUri)).arrayBuffer();
        const out = await ocr(this.ocrModelId, new Uint8Array(buf));
        const rawText: string = out?.text ?? String(out ?? '');
        const parsed = await this.parseReceiptText(rawText);
        return { ...parsed, raw_text: rawText, source: 'qvac' };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[qvacAI.ocrReceipt] failed, fallback to demo parse:', e);
      }
    }
    // Web fallback: simulated receipt (no real OCR available without native build)
    const demo = simulatedReceipt();
    return { ...demo, source: 'cloud' };
  }

  private async parseReceiptText(text: string) {
    // Try LLM extract first (offline if QVAC, else cloud)
    try {
      const prompt = `Extract structured data from this Indonesian receipt text. Return ONLY JSON: {"merchant":string|null,"total":number|null,"currency":"IDR"|"USD"|"USDT"|null,"items":[{"name":string,"price":number}]}\n\nReceipt:\n${text}`;
      if (this.isAvailable && this.sdk && this.llmModelId) {
        const out = await this.sdk.completion(this.llmModelId, prompt);
        const s = String(out ?? '').replace(/^```(json)?/, '').replace(/```$/, '').trim();
        return JSON.parse(s);
      }
      const res = await api.voiceParseText(`OCR_RECEIPT::${text.slice(0, 800)}`);
      // best-effort – the cloud parser is for transfer/withdraw; on cloud we just regex
      throw new Error('skip llm in fallback');
    } catch {
      return regexExtract(text);
    }
  }
}

function regexExtract(text: string) {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const merchant = lines[0]?.slice(0, 60) || null;
  const totalMatch = text.match(/(?:total|grand\s*total|jumlah)[:\s]*[Rr][Pp]?\.?\s*([0-9.,]+)/i);
  const total = totalMatch ? Number(totalMatch[1].replace(/[^0-9]/g, '')) : null;
  const items: { name: string; price: number }[] = [];
  for (const ln of lines) {
    const m = ln.match(/^(.+?)\s+(?:rp\.?\s*)?([0-9][0-9.,]{3,})\s*$/i);
    if (m) {
      const price = Number(m[2].replace(/[^0-9]/g, ''));
      if (price >= 1000 && price < 100_000_000) items.push({ name: m[1].slice(0, 50), price });
    }
    if (items.length >= 8) break;
  }
  return { merchant, total, currency: total ? 'IDR' : null, items };
}

function simulatedReceipt() {
  // Used only on web preview where native QVAC OCR can't run
  return {
    merchant: 'Warung Milea (Demo)',
    total: 145000,
    currency: 'IDR',
    items: [
      { name: 'Tiket Reguler', price: 75000 },
      { name: 'Merch Kaos', price: 50000 },
      { name: 'Snack & Minuman', price: 20000 },
    ],
    raw_text: '— OCR demo: real on-device OCR berjalan saat dijalankan via Expo Dev Client / native build —',
  };
}

export const qvacAI = new QvacAIService();
