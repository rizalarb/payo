import Constants from 'expo-constants';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || (Constants.expoConfig?.extra as any)?.backendUrl;

if (!BASE) {
  // eslint-disable-next-line no-console
  console.warn('EXPO_PUBLIC_BACKEND_URL is not set');
}

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
  total_usdt: number;
  total_idr: number;
  rate_usdt_idr: number;
  transaction_count: number;
  date: string;
  location: string;
  event: string;
};

export type Tx = {
  id: string;
  type: string;
  direction: 'IN' | 'OUT';
  amount: number;
  currency: string;
  counterparty?: string;
  address?: string;
  note?: string;
  timestamp: string;
};

export type Recipient = {
  name: string;
  address: string;
  last_amount?: number;
  last_currency?: string;
  last_timestamp?: string;
};

export const api = {
  dashboardToday: () => request<DashboardToday>('/dashboard/today'),
  exchangeRate: () => request<{ usdt_idr: number }>('/exchange-rate'),
  recentTransactions: (limit = 5) => request<{ items: Tx[]; count: number }>(`/transactions/recent?limit=${limit}`),
  listTransactions: (page = 1, limit = 10) =>
    request<{ items: Tx[]; page: number; limit: number; total: number; total_pages: number }>(
      `/transactions?page=${page}&limit=${limit}`,
    ),
  recentRecipients: () => request<{ items: Recipient[] }>('/recent-recipients'),
  transfer: (address: string, amount: number, note?: string) =>
    request<Tx>('/transfer', { method: 'POST', body: JSON.stringify({ address, amount, note }) }),
  generateQris: (amount: number, currency = 'IDR', note?: string) =>
    request<{ qris_payload: string; amount: number; currency: string; expires_at: string }>(
      '/qris/generate',
      { method: 'POST', body: JSON.stringify({ amount, currency, note }) },
    ),
  staticQris: () => request<{ qris_payload: string; merchant_name: string; merchant_id: string; location: string }>(
    '/qris/static',
  ),
};
