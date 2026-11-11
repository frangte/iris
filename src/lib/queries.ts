import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderDetail, OrderInput, OrderStatus } from '@shared/domain';
import { api, type CustomerInput, type OrderFilters, type ShopPatch } from './api';
import { useShop } from './session';

/**
 * Every shop-scoped key starts with ['shop', shopId] so one realtime event
 * (or one mutation) refreshes everything that shop shows.
 */
export const keys = {
  shop: (shopId: string) => ['shop', shopId] as const,
  detail: (shopId: string) => ['shop', shopId, 'detail'] as const,
  board: (shopId: string, today: string) => ['shop', shopId, 'board', today] as const,
  orders: (shopId: string, f: OrderFilters) => ['shop', shopId, 'orders', f] as const,
  order: (shopId: string, id: string) => ['shop', shopId, 'order', id] as const,
  customers: (shopId: string, q: string) => ['shop', shopId, 'customers', q] as const,
  customer: (shopId: string, id: string) => ['shop', shopId, 'customer', id] as const,
  members: (shopId: string) => ['shop', shopId, 'members'] as const,
  invites: (shopId: string) => ['shop', shopId, 'invites'] as const,
};

export function useShopDetail() {
  const { id } = useShop();
  return useQuery({ queryKey: keys.detail(id), queryFn: () => api.shop(id) });
}

export function useBoard(today: string) {
  const { id } = useShop();
  return useQuery({ queryKey: keys.board(id, today), queryFn: () => api.board(id, today) });
}

export function useOrders(filters: OrderFilters) {
  const { id } = useShop();
  return useQuery({ queryKey: keys.orders(id, filters), queryFn: () => api.orders(id, filters), placeholderData: (prev) => prev });
}

export function useOrder(orderId: string) {
  const { id } = useShop();
  return useQuery({ queryKey: keys.order(id, orderId), queryFn: () => api.order(id, orderId) });
}

export function useCustomers(search: string, enabled = true) {
  const { id } = useShop();
  return useQuery({
    queryKey: keys.customers(id, search),
    queryFn: () => api.customers(id, search || undefined),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useCustomer(customerId: string | undefined) {
  const { id } = useShop();
  return useQuery({
    queryKey: keys.customer(id, customerId ?? ''),
    queryFn: () => api.customer(id, customerId!),
    enabled: Boolean(customerId),
  });
}

export function useMembers() {
  const { id } = useShop();
  return useQuery({ queryKey: keys.members(id), queryFn: () => api.members(id) });
}

export function useInvites() {
  const { id } = useShop();
  return useQuery({ queryKey: keys.invites(id), queryFn: () => api.invites(id) });
}

/** Mutations write the fresh order into the cache, then refresh the shop's lists. */
function useOrderWrite<T>(fn: (shopId: string, vars: T) => Promise<OrderDetail>) {
  const { id } = useShop();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: T) => fn(id, vars),
    onSuccess: (order) => {
      qc.setQueryData(keys.order(id, order.id), order);
      qc.invalidateQueries({ queryKey: keys.shop(id) });
    },
  });
}

export const useCreateOrder = () =>
  useOrderWrite((shopId, input: OrderInput & { deposit?: number }) => api.createOrder(shopId, input));
export const useUpdateOrder = () =>
  useOrderWrite((shopId, v: { orderId: string; input: OrderInput }) => api.updateOrder(shopId, v.orderId, v.input));
export const useSetStatus = () =>
  useOrderWrite((shopId, v: { orderId: string; status: OrderStatus }) => api.setStatus(shopId, v.orderId, v.status));
export const useAddPayment = () =>
  useOrderWrite((shopId, v: { orderId: string; amount: number; note?: string }) =>
    api.addPayment(shopId, v.orderId, v.amount, v.note),
  );

function useShopWrite<T, R>(fn: (shopId: string, vars: T) => Promise<R>, also?: (string[])[]) {
  const { id } = useShop();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: T) => fn(id, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.shop(id) });
      for (const k of also ?? []) qc.invalidateQueries({ queryKey: k });
    },
  });
}

export const useDeleteOrder = () => useShopWrite((shopId, orderId: string) => api.deleteOrder(shopId, orderId));
export const useUpdateShop = () => useShopWrite((shopId, patch: ShopPatch) => api.updateShop(shopId, patch), [['me']]);
export const useCreateInvite = () => useShopWrite((shopId, _: void) => api.createInvite(shopId));
export const useRevokeInvite = () => useShopWrite((shopId, inviteId: string) => api.revokeInvite(shopId, inviteId));
export const useRemoveMember = () => useShopWrite((shopId, userId: string) => api.removeMember(shopId, userId), [['me']]);
export const useCreateCustomer = () => useShopWrite((shopId, input: CustomerInput) => api.createCustomer(shopId, input));
export const useUpdateCustomer = () =>
  useShopWrite((shopId, v: { customerId: string; input: CustomerInput }) => api.updateCustomer(shopId, v.customerId, v.input));
