import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';

import type { Order, Shop } from '@shared/domain';
import { orderRemaining } from '@shared/domain';
import { formatPhone, itemsSummary, vnd } from './format';

/**
 * Courier / ride apps a shop hands deliveries to. None of them publish
 * deep-link parameters for a prefilled pickup and drop-off, so the handoff
 * copies the details to the clipboard and opens the app; the shop pastes.
 *
 * App Store ids and iOS bundle ids were checked against the iTunes lookup API
 * (VN store, 2026-11-09). The custom URL schemes and the Grab / Lalamove
 * Android packages are unverified: confirm them on a real device before
 * release. A wrong scheme only means the store page opens instead.
 */
export type Courier = {
  id: 'grab' | 'xanhsm' | 'be' | 'ahamove' | 'lalamove';
  name: string;
  scheme: string;
  appStoreId: string;
  androidPackage: string;
};

export const COURIERS: Courier[] = [
  { id: 'grab', name: 'Grab', scheme: 'grab://', appStoreId: '647268330', androidPackage: 'com.grabtaxi.passenger' },
  { id: 'xanhsm', name: 'Xanh SM', scheme: 'xanhsm://', appStoreId: '6446425595', androidPackage: 'com.gsm.customer' },
  { id: 'be', name: 'Be', scheme: 'be://', appStoreId: '1440565902', androidPackage: 'xyz.be.customer' },
  { id: 'ahamove', name: 'Ahamove', scheme: 'ahamove://', appStoreId: '987325355', androidPackage: 'com.ahamove.user' },
  { id: 'lalamove', name: 'Lalamove', scheme: 'lalamove://', appStoreId: '735701965', androidPackage: 'hk.easyvan.app.client' },
];

export function deliveryText(order: Order, shop: Pick<Shop, 'name' | 'phone' | 'address'> | undefined): string {
  const lines: string[] = [];
  if (shop) {
    const pickup = [shop.name, shop.address, shop.phone ? formatPhone(shop.phone) : null].filter(Boolean).join(' · ');
    lines.push(`Lấy hàng: ${pickup}`);
  }
  const name = order.recipientName ?? order.customerName;
  const phone = order.recipientPhone ?? order.customerPhone;
  lines.push(`Giao tới: ${[name, phone ? formatPhone(phone) : null].filter(Boolean).join(' · ')}`);
  if (order.address) lines.push(`Địa chỉ: ${order.address}`);
  lines.push(`Hàng: ${itemsSummary(order)} (đơn #${order.number})`);
  const cod = orderRemaining(order);
  if (cod > 0) lines.push(`Thu hộ: ${vnd(cod)}`);
  if (order.note) lines.push(`Ghi chú: ${order.note}`);
  return lines.join('\n');
}

function storeUrl(c: Courier): string {
  if (Platform.OS === 'android') return `market://details?id=${c.androidPackage}`;
  if (Platform.OS === 'ios') return `itms-apps://apps.apple.com/app/id${c.appStoreId}`;
  return `https://apps.apple.com/vn/app/id${c.appStoreId}`;
}

export type HandoffResult = 'opened' | 'store' | 'copied';

/** Copies the delivery details, then opens the courier app (or its store page). */
export async function handOff(c: Courier, text: string): Promise<HandoffResult> {
  await Clipboard.setStringAsync(text);
  if (Platform.OS === 'web') return 'copied';
  try {
    await Linking.openURL(c.scheme);
    return 'opened';
  } catch {
    try {
      await Linking.openURL(storeUrl(c));
      return 'store';
    } catch {
      return 'copied';
    }
  }
}

export function mapsUrl(address: string): string {
  const query = encodeURIComponent(address);
  return Platform.OS === 'ios' ? `maps://?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function zaloUrl(phone: string): string {
  return `https://zalo.me/${phone.replace(/\D/g, '')}`;
}
