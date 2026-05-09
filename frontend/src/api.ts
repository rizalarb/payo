import Constants from 'expo-constants';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || (Constants.expoConfig?.extra as any)?.backendUrl;
const API = `${BASE}/api`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export type DashboardToday = {
  total_usdt: number; total_idr: number; rate_usdt_idr: number; transaction_count: number;
  date: string; location: string; event: string;
};

export type Tx = {
  id: string; type: string; direction: 'IN' | 'OUT';
  amount: number; currency: string; counterparty?: string;
  address?: string; note?: string; timestamp: string;
};

export type Recipient = { name: string; address: string; last_amount?: number; last_currency?: string; last_timestamp?: string };

export type DailySummaryItem = { date: string; total_usdt: number; total_idr: number; count: number };

export type Bank = { code: string; name: string };

export type WithdrawResult = {
  transaction: Tx;
  amount_idr: number; fee_idr: number; net_idr: number;
  usdt_debited: number; rate_usdt_idr: number; estimated_arrival: string;
};

export type VoiceIntent = {
  action: 'transfer' | 'withdraw';
  amount: number | null;
  currency: 'USDT' | 'IDR';
  recipient?: string | null;
  bank?: string | null;
  account_number?: string | null;
  note?: string | null;
  raw_text: string;
  source: string;
};

export const api = {
  baseUrl: API,
  dashboardToday: () => request<DashboardToday>('/dashboard/today'),
  exchangeRate: () => request<{ usdt_idr: number }>('/exchange-rate'),
  recentTransactions: (limit = 5) => request<{ items: Tx[]; count: number }>(`/transactions/recent?limit=${limit}`),
  listTransactions: (page = 1, limit = 10, date?: string) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (date) q.set('date', date);
    return request<{ items: Tx[]; page: number; limit: number; total: number; total_pages: number }>(`/transactions?${q}`);
  },
  dailySummary: (days = 14) => request<{ items: DailySummaryItem[]; rate_usdt_idr: number }>(`/transactions/daily-summary?days=${days}`),
  recentRecipients: () => request<{ items: Recipient[] }>('/recent-recipients'),
  banks: () => request<{ items: Bank[] }>('/banks'),
  transfer: (address: string, amount: number, note?: string) =>
    request<Tx>('/transfer', { method: 'POST', body: JSON.stringify({ address, amount, note }) }),
  withdraw: (bank_code: string, account_number: string, account_holder: string, amount_idr: number, note?: string) =>
    request<WithdrawResult>('/withdraw', { method: 'POST', body: JSON.stringify({ bank_code, account_number, account_holder, amount_idr, note }) }),
  generateQris: (amount: number, currency = 'IDR', note?: string) =>
    request<{ qris_payload: string; amount: number; currency: string; expires_at: string }>('/qris/generate', { method: 'POST', body: JSON.stringify({ amount, currency, note }) }),
  staticQris: () => request<{ qris_payload: string; merchant_name: string; merchant_id: string; location: string }>('/qris/static'),
  pinStatus: () => request<{ is_set: boolean; is_locked: boolean; failed_attempts: number; time_until_unlock: number | null }>('/pin/status'),
  pinCreate: (pin: string, confirm_pin: string) => request<{ status: string; message: string }>('/pin/create', { method: 'POST', body: JSON.stringify({ pin, confirm_pin }) }),
  pinVerify: (pin: string) => request<{ status: string; message: string }>('/pin/verify', { method: 'POST', body: JSON.stringify({ pin }) }),
  voiceParseText: async (text: string): Promise<{ transcript: string; intent: VoiceIntent }> => {
    const fd = new FormData();
    fd.append('text', text);
    const res = await fetch(`${API}/voice/parse-text`, { method: 'POST', body: fd as any });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  ocrExtract: async (base64: string): Promise<{ text: string }> => {
    const res = await fetch(`${API}/ocr/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },
  voiceParseAudio: async (uri: string, mimeType: string): Promise<{ transcript: string; intent: VoiceIntent }> => {
    const fd = new FormData();
    const filename = uri.split('/').pop() || 'voice.m4a';
    // @ts-ignore RN FormData accepts {uri,name,type}
    fd.append('audio', { uri, name: filename, type: mimeType } as any);
    const res = await fetch(`${API}/voice/parse`, { method: 'POST', body: fd as any });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },
};
