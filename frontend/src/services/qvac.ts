// QVAC SDK hybrid wrapper.
// - On native (build with Bare runtime), loads @qvac/sdk and runs OCR/STT/LLM fully on-device.
// - On web preview / when SDK init fails, falls back to FastAPI cloud routes (Whisper + GPT-4o-mini + GPT-4o vision).
// Public API never throws because of missing SDK; consumers just get a `mode` field telling them which path ran.

import { Platform } from 'react-native';
import { api } from '../api';

export type AIMode = 'qvac-offline' | 'cloud-fallback' | 'unknown';
export type AIStatus = {
  ready: boolean;
  mode: AIMode;
  models: { llm: boolean; stt: boolean; vision: boolean };
  message: string;
};

let sdkRef: any = null;
let llmId: string | null = null;
let sttId: string | null = null;
let visionId: string | null = null;
let initPromise: Promise<AIStatus> | null = null;
let cachedStatus: AIStatus = {
  ready: false,
  mode: 'unknown',
  models: { llm: false, stt: false, vision: false },
  message: 'Belum diinisialisasi',
};

/** Try loading @qvac/sdk lazily. Returns null if unavailable in current runtime (e.g., web). */
async function tryLoadSdk(): Promise<any | null> {
  // QVAC SDK uses Bare runtime native bindings. Only on native build with custom dev client.
  // We use indirect eval-require so Metro never statically resolves the module on web.
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line no-eval
    const _r: any = (0, eval)('typeof require !== "undefined" ? require : null');
    if (!_r) return null;
    const mod = _r('@qvac/sdk');
    return mod;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[QVAC] SDK require failed:', (e as Error)?.message);
    return null;
  }
}

export async function initQvac(): Promise<AIStatus> {
  if (initPromise) return initPromise;
  initPromise = (async (): Promise<AIStatus> => {
    const sdk = await tryLoadSdk();
    if (!sdk || typeof sdk.loadModel !== 'function') {
      cachedStatus = {
        ready: true,
        mode: 'cloud-fallback',
        models: { llm: false, stt: false, vision: false },
        message:
          Platform.OS === 'web'
            ? 'Web preview menggunakan Cloud Fallback (Whisper + GPT-4o-mini). Untuk QVAC penuh, build native (EAS).'
            : 'QVAC SDK tidak terdeteksi di runtime. Menggunakan Cloud Fallback.',
      };
      return cachedStatus;
    }
    sdkRef = sdk;
    const models: AIStatus['models'] = { llm: false, stt: false, vision: false };
    try {
      // Lightweight LLM for intent parsing
      llmId = await sdk.loadModel({ modelSrc: sdk.LLAMA_3_2_1B_INST_Q4_0, modelType: 'llm' });
      models.llm = !!llmId;
    } catch (e) {
      console.warn('[QVAC] LLM load failed', e);
    }
    try {
      // Whisper-equivalent STT
      const sttSrc = (sdk.WHISPER_TINY_Q4 || sdk.WHISPER_BASE_Q4 || sdk.WHISPER_TINY) ?? null;
      if (sttSrc) {
        sttId = await sdk.loadModel({ modelSrc: sttSrc, modelType: 'stt' });
        models.stt = !!sttId;
      }
    } catch (e) {
      console.warn('[QVAC] STT load failed', e);
    }
    try {
      const visionSrc = (sdk.MOONDREAM2_Q4 || sdk.LLAVA_PHI_3_MINI_Q4) ?? null;
      if (visionSrc) {
        visionId = await sdk.loadModel({ modelSrc: visionSrc, modelType: 'vision' });
        models.vision = !!visionId;
      }
    } catch (e) {
      console.warn('[QVAC] Vision load failed', e);
    }
    const anyLoaded = models.llm || models.stt || models.vision;
    cachedStatus = {
      ready: true,
      mode: anyLoaded ? 'qvac-offline' : 'cloud-fallback',
      models,
      message: anyLoaded
        ? `QVAC offline aktif (LLM:${models.llm ? '✓' : '–'} STT:${models.stt ? '✓' : '–'} Vision:${models.vision ? '✓' : '–'})`
        : 'QVAC SDK ada tapi model gagal load. Pakai Cloud Fallback.',
    };
    return cachedStatus;
  })();
  return initPromise;
}

export function getAIStatus(): AIStatus {
  return cachedStatus;
}

// =============== STT ===============
export async function transcribe(audioUri: string, mimeType: string) {
  if (sdkRef && sttId && typeof sdkRef.transcribe === 'function') {
    try {
      const out = await sdkRef.transcribe({ modelId: sttId, audioPath: audioUri });
      const text = (out?.text || out?.content || '').toString();
      return { transcript: text, mode: 'qvac-offline' as AIMode };
    } catch (e) {
      console.warn('[QVAC] transcribe failed, falling back', e);
    }
  }
  const res = await api.voiceParseAudio(audioUri, mimeType);
  return { transcript: res.transcript, intent: res.intent, mode: 'cloud-fallback' as AIMode };
}

// =============== Intent ===============
export type ParsedIntent = {
  action: 'transfer' | 'withdraw';
  amount: number | null;
  currency: 'USDT' | 'IDR';
  recipient?: string | null;
  bank?: string | null;
  account_number?: string | null;
  raw_text: string;
};

export async function parseIntent(text: string): Promise<ParsedIntent & { mode: AIMode }> {
  if (sdkRef && llmId && typeof sdkRef.completion === 'function') {
    try {
      const prompt =
        'Output ONLY valid JSON for an Indonesian payment intent. Keys: action ("transfer"|"withdraw"), amount (number|null), currency ("USDT"|"IDR"), recipient (string|null), bank (BCA|MANDIRI|BRI|BNI|CIMB|PERMATA|null), account_number (string|null). Rules: kirim/transfer→transfer; tarik/withdraw→withdraw; juta=1000000 IDR; ribu=1000 IDR.\nUser said: "' +
        text +
        '"';
      const r = await sdkRef.completion({ modelId: llmId, prompt, stream: false });
      const s: string = (r?.content || r?.text || '').toString().replace(/```json|```/g, '').trim();
      const data = JSON.parse(s);
      return { ...data, raw_text: text, mode: 'qvac-offline' };
    } catch (e) {
      console.warn('[QVAC] parseIntent failed, falling back', e);
    }
  }
  const r = await api.voiceParseText(text);
  return { ...(r.intent as any), raw_text: text, mode: 'cloud-fallback' };
}

// =============== OCR ===============
export type OcrResult = {
  text: string;
  addresses: string[]; // TRC20 candidates
  amounts_idr: number[];
  amounts_usdt: number[];
  mode: AIMode;
};

const TRC20_RE = /T[1-9A-HJ-NP-Za-km-z]{33}/g;
const IDR_RE = /(?:rp\.?\s*|idr\s*)([\d.,]+)|([\d]{1,3}(?:[.,]\d{3})+)\s*(?:rp|idr|rupiah)/gi;
const USDT_RE = /([\d]+(?:[.,]\d+)?)\s*(?:usdt|usdc)/gi;

export function extractFromText(text: string): Omit<OcrResult, 'mode'> {
  const addresses = Array.from(new Set((text.match(TRC20_RE) || []).map((s) => s.trim())));
  const amounts_idr: number[] = [];
  let m: RegExpExecArray | null;
  IDR_RE.lastIndex = 0;
  while ((m = IDR_RE.exec(text)) !== null) {
    const raw = (m[1] || m[2] || '').replace(/[.,]/g, '');
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n > 0) amounts_idr.push(n);
  }
  const amounts_usdt: number[] = [];
  USDT_RE.lastIndex = 0;
  while ((m = USDT_RE.exec(text)) !== null) {
    const n = parseFloat((m[1] || '').replace(',', '.'));
    if (!Number.isNaN(n) && n > 0) amounts_usdt.push(n);
  }
  return { text, addresses, amounts_idr, amounts_usdt };
}

export async function ocrFromImage(base64: string): Promise<OcrResult> {
  if (sdkRef && visionId && typeof sdkRef.completion === 'function') {
    try {
      const prompt = 'Read all visible text in the image. Return raw text only, preserving line breaks.';
      const r = await sdkRef.completion({ modelId: visionId, prompt, image: base64, stream: false });
      const text = (r?.content || r?.text || '').toString();
      return { ...extractFromText(text), mode: 'qvac-offline' };
    } catch (e) {
      console.warn('[QVAC] vision OCR failed, falling back', e);
    }
  }
  // Cloud fallback via FastAPI (GPT-4o vision through emergentintegrations)
  const res = await api.ocrExtract(base64);
  return { ...extractFromText(res.text), mode: 'cloud-fallback' };
}
