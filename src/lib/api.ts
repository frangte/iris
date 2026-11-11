import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  ApiErrorBody,
  Board,
  Customer,
  Invite,
  InvitePreview,
  Me,
  Member,
  Order,
  OrderDetail,
  OrderInput,
  OrderStatus,
  Shop,
  ShopSummary,
  User,
} from '@shared/domain';

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8787`;
  }
  // Dev: the API runs on the same machine as the Expo dev server.
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:8787`;
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setApiToken(next: string | null) {
  token = next;
}
export function getApiToken() {
  return token;
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? 'Có lỗi xảy ra, thử lại sau');
  }
  return data as T;
}

const q = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export type OrderFilters = { from?: string; to?: string; status?: OrderStatus[]; open?: boolean; q?: string; customerId?: string };
export type CustomerDetail = Customer & { orders: Order[] };
export type CustomerInput = { name: string; phone?: string | null; channel?: string | null; note?: string | null };
export type ShopPatch = Partial<Pick<Shop, 'name' | 'phone' | 'address' | 'bankBin' | 'bankAccountNo' | 'bankAccountName'>>;

export const api = {
  requestOtp: (email: string) => request<{ ok: true; devCode?: string }>('POST', '/auth/otp', { email }),
  verifyOtp: (email: string, code: string) => request<{ token: string; user: User }>('POST', '/auth/verify', { email, code }),
  logout: () => request<{ ok: true }>('POST', '/auth/logout'),
  me: () => request<Me>('GET', '/me'),
  updateMe: (name: string) => request<{ user: User }>('PATCH', '/me', { name }),

  createShop: (input: { name: string; phone?: string | null; address?: string | null }) =>
    request<Shop>('POST', '/shops', input),
  shop: (shopId: string) => request<Shop>('GET', `/shops/${shopId}`),
  updateShop: (shopId: string, patch: ShopPatch) => request<Shop>('PATCH', `/shops/${shopId}`, patch),
  deleteShop: (shopId: string) => request<{ ok: true }>('DELETE', `/shops/${shopId}`),

  members: (shopId: string) => request<Member[]>('GET', `/shops/${shopId}/members`),
  removeMember: (shopId: string, userId: string) => request<{ ok: true }>('DELETE', `/shops/${shopId}/members/${userId}`),
  invites: (shopId: string) => request<Invite[]>('GET', `/shops/${shopId}/invites`),
  createInvite: (shopId: string) => request<Invite>('POST', `/shops/${shopId}/invites`),
  revokeInvite: (shopId: string, inviteId: string) => request<{ ok: true }>('DELETE', `/shops/${shopId}/invites/${inviteId}`),
  previewInvite: (code: string) => request<InvitePreview>('GET', `/invites/${encodeURIComponent(code)}`),
  acceptInvite: (code: string) =>
    request<{ shopId: string; shops: ShopSummary[] }>('POST', `/invites/${encodeURIComponent(code)}/accept`),

  board: (shopId: string, today: string) => request<Board>('GET', `/shops/${shopId}/board${q({ today })}`),
  orders: (shopId: string, f: OrderFilters = {}) =>
    request<Order[]>(
      'GET',
      `/shops/${shopId}/orders${q({
        from: f.from,
        to: f.to,
        status: f.status?.join(','),
        open: f.open ? '1' : undefined,
        q: f.q,
        customerId: f.customerId,
      })}`,
    ),
  order: (shopId: string, orderId: string) => request<OrderDetail>('GET', `/shops/${shopId}/orders/${orderId}`),
  createOrder: (shopId: string, input: OrderInput & { deposit?: number }) =>
    request<OrderDetail>('POST', `/shops/${shopId}/orders`, input),
  updateOrder: (shopId: string, orderId: string, input: OrderInput) =>
    request<OrderDetail>('PUT', `/shops/${shopId}/orders/${orderId}`, input),
  setStatus: (shopId: string, orderId: string, status: OrderStatus) =>
    request<OrderDetail>('POST', `/shops/${shopId}/orders/${orderId}/status`, { status }),
  addPayment: (shopId: string, orderId: string, amount: number, note?: string) =>
    request<OrderDetail>('POST', `/shops/${shopId}/orders/${orderId}/payments`, { amount, note }),
  deleteOrder: (shopId: string, orderId: string) => request<{ ok: true }>('DELETE', `/shops/${shopId}/orders/${orderId}`),

  customers: (shopId: string, search?: string) => request<Customer[]>('GET', `/shops/${shopId}/customers${q({ q: search })}`),
  customer: (shopId: string, customerId: string) => request<CustomerDetail>('GET', `/shops/${shopId}/customers/${customerId}`),
  createCustomer: (shopId: string, input: CustomerInput) => request<{ id: string }>('POST', `/shops/${shopId}/customers`, input),
  updateCustomer: (shopId: string, customerId: string, input: CustomerInput) =>
    request<{ ok: true }>('PATCH', `/shops/${shopId}/customers/${customerId}`, input),
};

export function wsUrl(): string {
  return `${API_URL.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token ?? '')}`;
}
