const BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

export const API_URL = BASE;

export type PaymentMode = 'CASH' | 'UPI' | 'CREDIT';
export type BillLanguage = 'ENGLISH' | 'HINDI' | 'BOTH';

export interface Shop {
  id: number; name: string; ownerName: string; address: string; phone: string; gstNote: string;
  billLanguage: BillLanguage; lowStockGrams: number; printerEnabled: boolean; printerName: string;
  whatsappEnabled: boolean; lowStockAlert: boolean;
}

export interface Item {
  id: string; nameEn: string; nameHi: string; color: string;
  sellRatePaise: number; costRatePaise: number; stockGrams: number;
  capacityGrams: number; packetGrams: number; sortOrder: number; active: boolean;
}

export interface DashItem extends Item {
  soldTodayGrams: number;
  lastArrival: { at: string; dealer: string } | null;
}

export interface Dashboard {
  today: { totalPaise: number; cashPaise: number; upiPaise: number; creditPaise: number; bills: number };
  items: DashItem[];
  lowStock: { itemId: string; nameEn: string; stockGrams: number } | null;
  recentCustomers: { customerId: string; name: string; lines: { itemId: string; nameEn: string; grams: number }[] }[];
}

export interface Dealer { id: string; name: string; phone: string }

export interface Arrival {
  id: string; dealer: Dealer; slipNo: string; note: string; costPaise: number; receivedAt: string;
  lines: { id: string; itemId: string; item: Item; packets: number; gramsEach: number; totalGrams: number; costRatePaise: number; amountPaise: number }[];
}

export interface Customer {
  id: string; name: string; phone: string; balancePaise: number; billCount: number; lastBillAt: string | null;
}

export interface Bill {
  id: string; number: number; paymentMode: PaymentMode; customer: Customer | null;
  totalPaise: number; totalGrams: number; createdAt: string;
  lines: { id: string; item: Item; grams: number; ratePaise: number; amountPaise: number }[];
}

export interface WeekReport {
  days: { date: string; totalPaise: number }[];
  totalPaise: number;
  profitPaise: number;
  items: { id: string; nameEn: string; nameHi: string; color: string; grams: number; amountPaise: number }[];
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  shop: () => request<Shop | null>('/shop'),
  saveShop: (data: Partial<Shop>) => request<Shop>('/shop', 'PUT', data),

  dashboard: () => request<Dashboard>('/dashboard'),

  items: () => request<Item[]>('/items'),
  createItem: (data: Partial<Item>) => request<Item>('/items', 'POST', data),
  updateItem: (id: string, data: Partial<Item>) => request<Item>(`/items/${id}`, 'PATCH', data),
  setRate: (id: string, sellRatePaise: number) => request<Item>(`/items/${id}/rate`, 'PUT', { sellRatePaise }),
  setStock: (id: string, stockGrams: number) => request<Item>(`/items/${id}/stock`, 'PUT', { stockGrams }),
  removeItem: (id: string) => request<void>(`/items/${id}`, 'DELETE'),

  dealers: () => request<Dealer[]>('/dealers'),
  createDealer: (name: string, phone = '') => request<Dealer>('/dealers', 'POST', { name, phone }),

  arrivals: (days = 7) => request<Arrival[]>(`/arrivals?days=${days}`),
  createArrival: (data: {
    dealerId: string; slipNo?: string;
    lines: { itemId: string; packets: number; gramsEach: number; costRatePaise?: number }[];
  }) => request<Arrival>('/arrivals', 'POST', data),

  customers: () => request<Customer[]>('/customers'),
  createCustomer: (name: string, phone = '') => request<Customer>('/customers', 'POST', { name, phone }),
  settle: (id: string, amountPaise?: number) => request<Customer>(`/customers/${id}/payments`, 'POST', { amountPaise }),

  bill: (id: string) => request<Bill>(`/bills/${id}`),
  createBill: (data: { paymentMode: PaymentMode; customerId?: string | null; lines: { itemId: string; grams: number }[] }) =>
    request<Bill>('/bills', 'POST', data),

  week: () => request<WeekReport>('/reports/week'),
};
