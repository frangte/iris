// Shared between the Expo app and the Bun server. Keep this file free of
// platform imports: only zod and plain TypeScript.
import { z } from 'zod';

export const ORDER_STATUSES = [
  'new',
  'in_progress',
  'awaiting_approval',
  'delivering',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The forward path an order walks through. `cancelled` sits outside it. */
export const STATUS_FLOW: readonly OrderStatus[] = [
  'new',
  'in_progress',
  'awaiting_approval',
  'delivering',
  'delivered',
];

export const CLOSED_STATUSES: readonly OrderStatus[] = ['delivered', 'cancelled'];

export const ROLES = ['owner', 'manager'] as const;
export type Role = (typeof ROLES)[number];

export const CHANNELS = ['zalo', 'messenger', 'tiktok', 'instagram', 'phone', 'walk_in', 'other'] as const;
export type Channel = (typeof CHANNELS)[number];

export const FULFILLMENTS = ['delivery', 'pickup'] as const;
export type Fulfillment = (typeof FULFILLMENTS)[number];

/** Flowers first; the rest are reserved so the data model never has to change shape. */
export const BUSINESS_TYPES = ['flower', 'cake', 'gift', 'other'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const MAX_MONEY = 10_000_000_000; // 10 tỷ VND; anything above is a typo.

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const money = z.number().int().min(0).max(MAX_MONEY);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ');
export const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ')
  .nullish()
  .transform((v) => v ?? null);

export const emailSchema = z.string().trim().toLowerCase().email('Email không hợp lệ').max(254);
export const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .nullish()
  .transform((v) => (v ? v.replace(/[^\d+]/g, '') || null : null));

export const otpRequestSchema = z.object({ email: emailSchema });
export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Mã gồm 6 chữ số'),
});

export const profileUpdateSchema = z.object({ name: trimmed(80).min(1, 'Nhập tên') });

export const shopCreateSchema = z.object({
  name: trimmed(80).min(1, 'Nhập tên shop'),
  businessType: z.enum(BUSINESS_TYPES).default('flower'),
  phone: phoneSchema,
  address: optionalText(300),
});

export const shopUpdateSchema = z.object({
  name: trimmed(80).min(1, 'Nhập tên shop').optional(),
  phone: phoneSchema.optional(),
  address: optionalText(300).optional(),
  bankBin: optionalText(10).optional(),
  bankAccountNo: optionalText(30).optional(),
  bankAccountName: optionalText(80).optional(),
});

export const orderItemSchema = z.object({
  name: trimmed(200).min(1, 'Nhập tên sản phẩm'),
  quantity: z.number().int().min(1).max(10_000).default(1),
  unitPrice: money.default(0),
  note: optionalText(500),
});

export const orderInputSchema = z
  .object({
    customerId: z.string().uuid().nullish().transform((v) => v ?? null),
    customerName: optionalText(120),
    customerPhone: phoneSchema,
    channel: z.enum(CHANNELS).nullish().transform((v) => v ?? null),
    fulfillment: z.enum(FULFILLMENTS).default('delivery'),
    recipientName: optionalText(120),
    recipientPhone: phoneSchema,
    address: optionalText(300),
    dueDate: isoDate,
    timeFrom: hhmm,
    timeTo: hhmm,
    cardMessage: optionalText(1000),
    note: optionalText(2000),
    shippingFee: money.default(0),
    discount: money.default(0),
    items: z.array(orderItemSchema).min(1, 'Thêm ít nhất một sản phẩm').max(50),
  })
  .refine((o) => !(o.timeFrom && o.timeTo) || o.timeFrom <= o.timeTo, {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['timeTo'],
  });
export type OrderInput = z.input<typeof orderInputSchema>;

/** Only on create: money taken when the order is written down (usually a transfer deposit). */
export const depositSchema = z.object({ deposit: money.default(0) });

export const statusChangeSchema = z.object({ status: z.enum(ORDER_STATUSES) });

export const paymentSchema = z.object({
  amount: z.number().int().min(-MAX_MONEY).max(MAX_MONEY).refine((v) => v !== 0, 'Số tiền phải khác 0'),
  note: optionalText(200),
});

export const customerInputSchema = z.object({
  name: trimmed(120).min(1, 'Nhập tên khách'),
  phone: phoneSchema,
  channel: z.enum(CHANNELS).nullish().transform((v) => v ?? null),
  note: optionalText(1000),
});

// ---- DTOs returned by the API (camelCase, money in integer VND) ----

export type User = { id: string; email: string; name: string | null };

export type ShopSummary = {
  id: string;
  name: string;
  businessType: BusinessType;
  role: Role;
};

export type Shop = ShopSummary & {
  phone: string | null;
  address: string | null;
  bankBin: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  createdAt: string;
};

export type Me = { user: User; shops: ShopSummary[] };

export type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  joinedAt: string;
};

export type Invite = {
  id: string;
  code: string;
  createdBy: string;
  expiresAt: string;
  uses: number;
  createdAt: string;
};

export type InvitePreview = {
  code: string;
  shopId: string;
  shopName: string;
  invitedBy: string | null;
  alreadyMember: boolean;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  channel: Channel | null;
  note: string | null;
  orderCount: number;
  totalSpent: number;
  /** Still unpaid across this customer's open and delivered orders. */
  owed: number;
  lastOrderAt: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  note: string | null;
};

export type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  channel: Channel | null;
  fulfillment: Fulfillment;
  recipientName: string | null;
  recipientPhone: string | null;
  address: string | null;
  dueDate: string;
  timeFrom: string | null;
  timeTo: string | null;
  cardMessage: string | null;
  note: string | null;
  itemsTotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paid: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type OrderEventType = 'created' | 'updated' | 'status' | 'payment';

export type OrderEvent = {
  id: string;
  type: OrderEventType;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  amount: number | null;
  note: string | null;
  actorName: string | null;
  createdAt: string;
};

export type OrderDetail = Order & { events: OrderEvent[] };

export type Board = {
  /** Open orders whose due date is before `today`. */
  overdue: Order[];
  /** Everything due on `today`, any status. The client decides lateness by time window. */
  today: Order[];
  /** Open orders due in the next 7 days, excluding today. */
  upcoming: Order[];
};

/** Pushed over the WebSocket whenever shared data changes. */
export type RealtimeEvent =
  | { type: 'changed'; shopId: string; entity: 'order' | 'customer' | 'shop' | 'member' | 'invite'; id?: string }
  | { type: 'membership' }
  | { type: 'pong' };

export type ApiErrorBody = { error: { code: string; message: string } };

export function orderRemaining(o: Pick<Order, 'total' | 'paid' | 'status'>): number {
  if (o.status === 'cancelled') return 0;
  return Math.max(0, o.total - o.paid);
}
