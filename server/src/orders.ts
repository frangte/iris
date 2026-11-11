import { Hono } from 'hono';
import { z } from 'zod';
import {
  CLOSED_STATUSES,
  customerInputSchema,
  depositSchema,
  isoDate,
  ORDER_STATUSES,
  orderInputSchema,
  paymentSchema,
  statusChangeSchema,
  type Board,
  type Customer,
  type Order,
  type OrderDetail,
  type OrderEvent,
  type OrderItem,
} from '../../shared/domain';
import { requireAuth } from './auth';
import type { AppEnv, Deps } from './context';
import type { DB } from './db';
import { requireMember } from './shops';
import { ApiError, notFound, parse, readJson, uuid } from './util';

type OrderRow = Omit<Order, 'items' | 'total'>;

const ORDER_COLUMNS = `
  o.id, o.number, o.status, o.customer_id AS customerId, o.customer_name AS customerName,
  o.customer_phone AS customerPhone, o.channel, o.fulfillment, o.recipient_name AS recipientName,
  o.recipient_phone AS recipientPhone, o.address, o.due_date AS dueDate, o.time_from AS timeFrom,
  o.time_to AS timeTo, o.card_message AS cardMessage, o.note, o.items_total AS itemsTotal,
  o.shipping_fee AS shippingFee, o.discount, o.paid, o.created_at AS createdAt, o.updated_at AS updatedAt`;

const ORDER_SORT = `ORDER BY o.due_date, COALESCE(o.time_from, '99:99'), o.number`;
const CLOSED_SQL = CLOSED_STATUSES.map((s) => `'${s}'`).join(',');

function attachItems(db: DB, rows: OrderRow[]): Order[] {
  if (rows.length === 0) return [];
  const byOrder = new Map<string, OrderItem[]>();
  // SQLite caps bound parameters; chunk to stay well under it.
  for (let i = 0; i < rows.length; i += 500) {
    const ids = rows.slice(i, i + 500).map((r) => r.id);
    const items = db
      .query(
        `SELECT id, order_id AS orderId, name, quantity, unit_price AS unitPrice, note
           FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})
          ORDER BY position`,
      )
      .all(...ids) as (OrderItem & { orderId: string })[];
    for (const { orderId, ...item } of items) {
      const list = byOrder.get(orderId) ?? [];
      list.push(item);
      byOrder.set(orderId, list);
    }
  }
  return rows.map((r) => ({
    ...r,
    total: Math.max(0, r.itemsTotal + r.shippingFee - r.discount),
    items: byOrder.get(r.id) ?? [],
  }));
}

function queryOrders(db: DB, where: string, params: (string | number)[], limit = 500): Order[] {
  const rows = db
    .query(`SELECT ${ORDER_COLUMNS} FROM orders o WHERE ${where} ${ORDER_SORT} LIMIT ${Math.min(limit, 1000)}`)
    .all(...params) as OrderRow[];
  return attachItems(db, rows);
}

function getOrder(db: DB, shopId: string, orderId: string): Order {
  const [order] = queryOrders(db, 'o.shop_id = ? AND o.id = ?', [shopId, orderId], 1);
  if (!order) throw notFound('Không tìm thấy đơn');
  return order;
}

function getOrderDetail(db: DB, shopId: string, orderId: string): OrderDetail {
  const order = getOrder(db, shopId, orderId);
  const events = db
    .query(
      `SELECT e.id, e.type, e.from_status AS fromStatus, e.to_status AS toStatus, e.amount, e.note,
              COALESCE(u.name, u.email) AS actorName, e.created_at AS createdAt
         FROM order_events e LEFT JOIN users u ON u.id = e.user_id
        WHERE e.order_id = ?
        ORDER BY e.created_at DESC, e.rowid DESC`,
    )
    .all(orderId) as OrderEvent[];
  return { ...order, events };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type ParsedOrder = z.output<typeof orderInputSchema>;

/** Links the order to a customer record, creating one from the order's contact details when needed. */
function resolveCustomer(db: DB, shopId: string, input: ParsedOrder): string | null {
  if (input.customerId) {
    const found = db.query('SELECT id FROM customers WHERE id = ? AND shop_id = ?').get(input.customerId, shopId);
    if (!found) throw new ApiError(400, 'invalid_customer', 'Khách hàng không thuộc shop này');
    return input.customerId;
  }
  if (input.customerPhone) {
    const existing = db
      .query('SELECT id FROM customers WHERE shop_id = ? AND phone = ?')
      .get(shopId, input.customerPhone) as { id: string } | null;
    if (existing) return existing.id;
  }
  if (!input.customerName && !input.customerPhone) return null;
  const id = uuid();
  db.query('INSERT INTO customers (id, shop_id, name, phone, channel) VALUES (?, ?, ?, ?, ?)').run(
    id,
    shopId,
    input.customerName ?? input.customerPhone!,
    input.customerPhone,
    input.channel,
  );
  return id;
}

function writeItems(db: DB, orderId: string, items: ParsedOrder['items']) {
  db.query('DELETE FROM order_items WHERE order_id = ?').run(orderId);
  const insert = db.query(
    'INSERT INTO order_items (id, order_id, position, name, quantity, unit_price, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  items.forEach((it, i) => insert.run(uuid(), orderId, i, it.name, it.quantity, it.unitPrice, it.note));
  return items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
}

function logEvent(
  db: DB,
  orderId: string,
  userId: string,
  e: { type: OrderEvent['type']; from?: string | null; to?: string | null; amount?: number | null; note?: string | null },
) {
  db.query(
    'INSERT INTO order_events (id, order_id, user_id, type, from_status, to_status, amount, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(uuid(), orderId, userId, e.type, e.from ?? null, e.to ?? null, e.amount ?? null, e.note ?? null);
}

const listQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  status: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : []))
    .pipe(z.array(z.enum(ORDER_STATUSES))),
  open: z.enum(['0', '1']).optional(),
  q: z.string().trim().max(100).optional(),
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export function orderRoutes(deps: Deps) {
  const { db, hub } = deps;
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps);
  const member = requireMember(deps);
  const changed = (shopId: string, entity: 'order' | 'customer', id?: string) =>
    hub.publish(shopId, { type: 'changed', shopId, entity, id });

  app.get('/shops/:shopId/board', auth, member, (c) => {
    const today = parse(isoDate, c.req.query('today'));
    const { shopId } = c.get('member');
    const body: Board = {
      overdue: queryOrders(db, `o.shop_id = ? AND o.due_date < ? AND o.status NOT IN (${CLOSED_SQL})`, [shopId, today]),
      today: queryOrders(db, 'o.shop_id = ? AND o.due_date = ?', [shopId, today]),
      upcoming: queryOrders(
        db,
        `o.shop_id = ? AND o.due_date > ? AND o.due_date <= ? AND o.status NOT IN (${CLOSED_SQL})`,
        [shopId, today, addDays(today, 7)],
      ),
    };
    return c.json(body);
  });

  app.get('/shops/:shopId/orders', auth, member, (c) => {
    const q = parse(listQuerySchema, c.req.query());
    const { shopId } = c.get('member');
    const where = ['o.shop_id = ?'];
    const params: (string | number)[] = [shopId];
    if (q.from) (where.push('o.due_date >= ?'), params.push(q.from));
    if (q.to) (where.push('o.due_date <= ?'), params.push(q.to));
    if (q.status.length) {
      where.push(`o.status IN (${q.status.map(() => '?').join(',')})`);
      params.push(...q.status);
    }
    if (q.open === '1') where.push(`o.status NOT IN (${CLOSED_SQL})`);
    if (q.customerId) (where.push('o.customer_id = ?'), params.push(q.customerId));
    if (q.q) {
      const like = `%${q.q.replace(/[%_]/g, '')}%`;
      const asNumber = Number(q.q.replace(/^#/, ''));
      where.push(
        `(o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.recipient_name LIKE ? OR o.address LIKE ?${
          Number.isInteger(asNumber) && asNumber > 0 ? ' OR o.number = ?' : ''
        })`,
      );
      params.push(like, like, like, like);
      if (Number.isInteger(asNumber) && asNumber > 0) params.push(asNumber);
    }
    return c.json(queryOrders(db, where.join(' AND '), params, q.limit ?? 300));
  });

  app.post('/shops/:shopId/orders', auth, member, async (c) => {
    const body = await readJson(c.req);
    const input = parse(orderInputSchema, body);
    const { deposit } = parse(depositSchema, body);
    const { shopId } = c.get('member');
    const user = c.get('user');
    const id = uuid();
    db.transaction(() => {
      const { order_seq: number } = db
        .query('UPDATE shops SET order_seq = order_seq + 1 WHERE id = ? RETURNING order_seq')
        .get(shopId) as { order_seq: number };
      const customerId = resolveCustomer(db, shopId, input);
      db.query(
        `INSERT INTO orders (id, shop_id, number, customer_id, customer_name, customer_phone, channel, fulfillment,
           recipient_name, recipient_phone, address, due_date, time_from, time_to, card_message, note,
           shipping_fee, discount, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        shopId,
        number,
        customerId,
        input.customerName,
        input.customerPhone,
        input.channel,
        input.fulfillment,
        input.recipientName,
        input.recipientPhone,
        input.fulfillment === 'delivery' ? input.address : null,
        input.dueDate,
        input.timeFrom,
        input.timeTo,
        input.cardMessage,
        input.note,
        input.shippingFee,
        input.discount,
        user.id,
      );
      const itemsTotal = writeItems(db, id, input.items);
      const total = Math.max(0, itemsTotal + input.shippingFee - input.discount);
      if (deposit > total) throw new ApiError(400, 'paid_exceeds_total', 'Tiền cọc vượt quá tổng đơn');
      db.query('UPDATE orders SET items_total = ?, paid = ? WHERE id = ?').run(itemsTotal, deposit, id);
      logEvent(db, id, user.id, { type: 'created', to: 'new' });
      if (deposit > 0) logEvent(db, id, user.id, { type: 'payment', amount: deposit, note: 'Cọc khi tạo đơn' });
    })();
    changed(shopId, 'order', id);
    return c.json(getOrderDetail(db, shopId, id), 201);
  });

  app.get('/shops/:shopId/orders/:orderId', auth, member, (c) =>
    c.json(getOrderDetail(db, c.get('member').shopId, c.req.param('orderId'))),
  );

  app.put('/shops/:shopId/orders/:orderId', auth, member, async (c) => {
    const input = parse(orderInputSchema, await readJson(c.req));
    const { shopId } = c.get('member');
    const user = c.get('user');
    const existing = getOrder(db, shopId, c.req.param('orderId'));
    db.transaction(() => {
      const customerId = resolveCustomer(db, shopId, input);
      const itemsTotal = writeItems(db, existing.id, input.items);
      const total = Math.max(0, itemsTotal + input.shippingFee - input.discount);
      if (existing.paid > total) {
        throw new ApiError(409, 'paid_exceeds_total', 'Tổng đơn mới thấp hơn số tiền khách đã trả');
      }
      db.query(
        `UPDATE orders SET customer_id = ?, customer_name = ?, customer_phone = ?, channel = ?, fulfillment = ?,
           recipient_name = ?, recipient_phone = ?, address = ?, due_date = ?, time_from = ?, time_to = ?,
           card_message = ?, note = ?, shipping_fee = ?, discount = ?, items_total = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?`,
      ).run(
        customerId,
        input.customerName,
        input.customerPhone,
        input.channel,
        input.fulfillment,
        input.recipientName,
        input.recipientPhone,
        input.fulfillment === 'delivery' ? input.address : null,
        input.dueDate,
        input.timeFrom,
        input.timeTo,
        input.cardMessage,
        input.note,
        input.shippingFee,
        input.discount,
        itemsTotal,
        existing.id,
      );
      logEvent(db, existing.id, user.id, { type: 'updated' });
    })();
    changed(shopId, 'order', existing.id);
    return c.json(getOrderDetail(db, shopId, existing.id));
  });

  app.post('/shops/:shopId/orders/:orderId/status', auth, member, async (c) => {
    const { status } = parse(statusChangeSchema, await readJson(c.req));
    const { shopId } = c.get('member');
    const order = getOrder(db, shopId, c.req.param('orderId'));
    if (order.status !== status) {
      db.transaction(() => {
        db.query("UPDATE orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
          status,
          order.id,
        );
        logEvent(db, order.id, c.get('user').id, { type: 'status', from: order.status, to: status });
      })();
      changed(shopId, 'order', order.id);
    }
    return c.json(getOrderDetail(db, shopId, order.id));
  });

  app.post('/shops/:shopId/orders/:orderId/payments', auth, member, async (c) => {
    const { amount, note } = parse(paymentSchema, await readJson(c.req));
    const { shopId } = c.get('member');
    const order = getOrder(db, shopId, c.req.param('orderId'));
    const paid = order.paid + amount;
    if (paid < 0) throw new ApiError(400, 'paid_negative', 'Số tiền hoàn lớn hơn số khách đã trả');
    if (paid > order.total) throw new ApiError(400, 'paid_exceeds_total', 'Số tiền vượt quá tổng đơn');
    db.transaction(() => {
      db.query("UPDATE orders SET paid = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
        paid,
        order.id,
      );
      logEvent(db, order.id, c.get('user').id, { type: 'payment', amount, note });
    })();
    changed(shopId, 'order', order.id);
    return c.json(getOrderDetail(db, shopId, order.id));
  });

  app.delete('/shops/:shopId/orders/:orderId', auth, member, (c) => {
    const { shopId } = c.get('member');
    const res = db.query('DELETE FROM orders WHERE id = ? AND shop_id = ?').run(c.req.param('orderId'), shopId);
    if (res.changes === 0) throw notFound('Không tìm thấy đơn');
    changed(shopId, 'order', c.req.param('orderId'));
    return c.json({ ok: true });
  });

  // ---- customers ----

  const CUSTOMER_SELECT = `
    SELECT c.id, c.name, c.phone, c.channel, c.note, c.created_at AS createdAt,
           COUNT(o.id) AS orderCount,
           COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN max(0, o.items_total + o.shipping_fee - o.discount) END), 0) AS totalSpent,
           COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN max(0, max(0, o.items_total + o.shipping_fee - o.discount) - o.paid) END), 0) AS owed,
           MAX(o.due_date) AS lastOrderAt
      FROM customers c LEFT JOIN orders o ON o.customer_id = c.id`;

  app.get('/shops/:shopId/customers', auth, member, (c) => {
    const { shopId } = c.get('member');
    const q = (c.req.query('q') ?? '').trim().slice(0, 100);
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const rows = db
      .query(
        `${CUSTOMER_SELECT}
          WHERE c.shop_id = ? ${q ? 'AND (c.name LIKE ? OR c.phone LIKE ?)' : ''}
          GROUP BY c.id
          ORDER BY COALESCE(MAX(o.due_date), c.created_at) DESC
          LIMIT 500`,
      )
      .all(...(q ? [shopId, like, like] : [shopId])) as Customer[];
    return c.json(rows);
  });

  app.get('/shops/:shopId/customers/:customerId', auth, member, (c) => {
    const { shopId } = c.get('member');
    const row = db
      .query(`${CUSTOMER_SELECT} WHERE c.shop_id = ? AND c.id = ? GROUP BY c.id`)
      .get(shopId, c.req.param('customerId')) as Customer | null;
    if (!row) throw notFound('Không tìm thấy khách');
    const orders = queryOrders(db, 'o.shop_id = ? AND o.customer_id = ?', [shopId, row.id], 200).reverse();
    return c.json({ ...row, orders });
  });

  app.post('/shops/:shopId/customers', auth, member, async (c) => {
    const input = parse(customerInputSchema, await readJson(c.req));
    const { shopId } = c.get('member');
    const id = uuid();
    try {
      db.query('INSERT INTO customers (id, shop_id, name, phone, channel, note) VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        shopId,
        input.name,
        input.phone,
        input.channel,
        input.note,
      );
    } catch (err) {
      if (String(err).includes('UNIQUE')) throw new ApiError(409, 'phone_taken', 'Số điện thoại này đã có trong danh bạ');
      throw err;
    }
    changed(shopId, 'customer', id);
    return c.json({ id }, 201);
  });

  app.patch('/shops/:shopId/customers/:customerId', auth, member, async (c) => {
    const input = parse(customerInputSchema, await readJson(c.req));
    const { shopId } = c.get('member');
    try {
      const res = db
        .query(
          `UPDATE customers SET name = ?, phone = ?, channel = ?, note = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE id = ? AND shop_id = ?`,
        )
        .run(input.name, input.phone, input.channel, input.note, c.req.param('customerId'), shopId);
      if (res.changes === 0) throw notFound('Không tìm thấy khách');
    } catch (err) {
      if (String(err).includes('UNIQUE')) throw new ApiError(409, 'phone_taken', 'Số điện thoại này đã có trong danh bạ');
      throw err;
    }
    changed(shopId, 'customer', c.req.param('customerId'));
    return c.json({ ok: true });
  });

  return app;
}
