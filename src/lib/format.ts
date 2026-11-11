import type { Channel, Fulfillment, Order, OrderStatus } from '@shared/domain';
import { CLOSED_STATUSES, STATUS_FLOW } from '@shared/domain';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/** 1250000 → "1.250.000đ" */
export function vnd(amount: number): string {
  return `${moneyFmt.format(Math.round(amount))}đ`;
}

/** Digits only, for money inputs: "1.250.000" → 1250000. */
export function parseMoney(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? Math.min(Number(digits), 10_000_000_000) : 0;
}

export function formatMoneyInput(amount: number): string {
  return amount ? moneyFmt.format(amount) : '';
}

// ---- dates (local calendar dates as YYYY-MM-DD) ----

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(now = new Date()): string {
  return toIsoDate(now);
}

export function addDaysIso(s: string, days: number): string {
  const d = fromIsoDate(s);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "Thứ Hai, 9/11" */
export function longDate(s: string): string {
  const d = fromIsoDate(s);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

/** "Hôm nay", "Ngày mai", "Hôm qua", or "Thứ Năm, 12/11". */
export function relativeDate(s: string, today = todayIso()): string {
  if (s === today) return 'Hôm nay';
  if (s === addDaysIso(today, 1)) return 'Ngày mai';
  if (s === addDaysIso(today, -1)) return 'Hôm qua';
  return longDate(s);
}

export function timeWindow(o: Pick<Order, 'timeFrom' | 'timeTo'>): string | null {
  if (o.timeFrom && o.timeTo) return `${o.timeFrom}–${o.timeTo}`;
  if (o.timeFrom) return `từ ${o.timeFrom}`;
  if (o.timeTo) return `trước ${o.timeTo}`;
  return null;
}

export function hhmmNow(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Late = still open and past its due date, or past the end of today's window. */
export function isLate(o: Pick<Order, 'status' | 'dueDate' | 'timeFrom' | 'timeTo'>, now = new Date()): boolean {
  if (CLOSED_STATUSES.includes(o.status)) return false;
  const today = todayIso(now);
  if (o.dueDate < today) return true;
  if (o.dueDate > today) return false;
  const deadline = o.timeTo ?? o.timeFrom;
  return deadline ? deadline < hhmmNow(now) : false;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'anytime';
export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  evening: 'Tối',
  anytime: 'Chưa hẹn giờ',
};

export function dayPart(o: Pick<Order, 'timeFrom' | 'timeTo'>): DayPart {
  const t = o.timeFrom ?? o.timeTo;
  if (!t) return 'anytime';
  if (t < '12:00') return 'morning';
  if (t < '18:00') return 'afternoon';
  return 'evening';
}

// ---- labels ----

export function statusLabel(status: OrderStatus, fulfillment: Fulfillment = 'delivery'): string {
  switch (status) {
    case 'new':
      return 'Mới';
    case 'in_progress':
      return 'Đang làm';
    case 'awaiting_approval':
      return 'Chờ khách duyệt';
    case 'delivering':
      return fulfillment === 'pickup' ? 'Chờ khách lấy' : 'Đang giao';
    case 'delivered':
      return fulfillment === 'pickup' ? 'Khách đã lấy' : 'Đã giao';
    case 'cancelled':
      return 'Đã huỷ';
  }
}

/** The button that moves an order one step forward. */
export function nextStatus(o: Pick<Order, 'status' | 'fulfillment'>): { status: OrderStatus; label: string } | null {
  const i = STATUS_FLOW.indexOf(o.status);
  if (i < 0 || i === STATUS_FLOW.length - 1) return null;
  const next = STATUS_FLOW[i + 1];
  const pickup = o.fulfillment === 'pickup';
  const label: Record<OrderStatus, string> = {
    new: 'Mới',
    in_progress: 'Bắt đầu làm',
    awaiting_approval: 'Gửi khách duyệt',
    delivering: pickup ? 'Báo khách tới lấy' : 'Bắt đầu giao',
    delivered: pickup ? 'Khách đã lấy' : 'Đã giao xong',
    cancelled: 'Huỷ đơn',
  };
  return { status: next, label: label[next] };
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  zalo: 'Zalo',
  messenger: 'Messenger',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  phone: 'Gọi điện',
  walk_in: 'Tại tiệm',
  other: 'Khác',
};

export function itemsSummary(o: Pick<Order, 'items'>): string {
  if (o.items.length === 0) return '';
  const [first, ...rest] = o.items;
  const head = first.quantity > 1 ? `${first.quantity} × ${first.name}` : first.name;
  return rest.length ? `${head} +${rest.length}` : head;
}

/** "0909123456" → "0909 123 456" */
export function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (d.length === 11) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return phone;
}

export function orderTitle(o: Pick<Order, 'customerName' | 'recipientName' | 'number'>): string {
  return o.customerName ?? o.recipientName ?? `Khách lẻ #${o.number}`;
}
