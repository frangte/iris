import { beforeEach, describe, expect, test } from 'bun:test';
import type { Board, Customer, Me, OrderDetail, Shop } from '../../shared/domain';
import { createApp } from './app';
import { nullHub } from './context';
import { openDatabase } from './db';
import { ConsoleMailer } from './mailer';

let clock = Date.parse('2026-11-09T03:00:00Z');
let mailer: ConsoleMailer;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  clock = Date.parse('2026-11-09T03:00:00Z');
  mailer = new ConsoleMailer(true);
  app = createApp({ db: openDatabase(':memory:'), mailer, hub: nullHub, now: () => clock });
});

async function call<T = any>(method: string, path: string, token?: string, body?: unknown) {
  const res = await app.request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as T };
}

async function signIn(email: string): Promise<string> {
  expect((await call('POST', '/auth/otp', undefined, { email })).status).toBe(200);
  const { code } = mailer.sent.findLast((m) => m.email === email.toLowerCase())!;
  const res = await call<{ token: string }>('POST', '/auth/verify', undefined, { email, code });
  expect(res.status).toBe(200);
  clock += 31_000; // step past the resend gap so later sign-ins work
  return res.body.token;
}

async function createShop(token: string, name = 'Tiệm hoa Mộc') {
  const res = await call<Shop>('POST', '/shops', token, { name });
  expect(res.status).toBe(201);
  return res.body;
}

const order = (over: Record<string, unknown> = {}) => ({
  customerName: 'Chị Thảo',
  customerPhone: '0909 123 456',
  channel: 'zalo',
  fulfillment: 'delivery',
  address: '12 Lê Lợi, Q.1',
  dueDate: '2026-11-09',
  timeFrom: '08:00',
  timeTo: '09:00',
  shippingFee: 30_000,
  discount: 10_000,
  items: [
    { name: 'Bó hồng đỏ 20 cành', quantity: 1, unitPrice: 650_000 },
    { name: 'Thiệp', quantity: 2, unitPrice: 15_000 },
  ],
  ...over,
});

describe('auth', () => {
  test('email OTP signs in and a wrong code is rejected', async () => {
    await call('POST', '/auth/otp', undefined, { email: 'Owner@Shop.vn' });
    const { code } = mailer.sent[0];
    const wrong = code === '000000' ? '111111' : '000000';
    const bad = await call('POST', '/auth/verify', undefined, { email: 'owner@shop.vn', code: wrong });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('otp_invalid');

    const ok = await call('POST', '/auth/verify', undefined, { email: 'owner@shop.vn', code });
    expect(ok.status).toBe(200);
    const me = await call<Me>('GET', '/me', ok.body.token);
    expect(me.body.user.email).toBe('owner@shop.vn');
    expect(me.body.shops).toEqual([]);

    // The code is single use.
    const reuse = await call('POST', '/auth/verify', undefined, { email: 'owner@shop.vn', code });
    expect(reuse.status).toBe(400);
  });

  test('resending within 30 seconds is refused', async () => {
    await call('POST', '/auth/otp', undefined, { email: 'a@b.vn' });
    const again = await call('POST', '/auth/otp', undefined, { email: 'a@b.vn' });
    expect(again.status).toBe(429);
  });

  test('five wrong codes lock the OTP', async () => {
    await call('POST', '/auth/otp', undefined, { email: 'a@b.vn' });
    const { code } = mailer.sent[0];
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await call('POST', '/auth/verify', undefined, { email: 'a@b.vn', code: wrong });
    const locked = await call('POST', '/auth/verify', undefined, { email: 'a@b.vn', code });
    expect(locked.status).toBe(429);
  });

  test('requests without a valid token get 401; logout ends the session', async () => {
    expect((await call('GET', '/me')).status).toBe(401);
    expect((await call('GET', '/me', 'garbage')).status).toBe(401);
    const token = await signIn('a@b.vn');
    expect((await call('POST', '/auth/logout', token)).status).toBe(200);
    expect((await call('GET', '/me', token)).status).toBe(401);
  });
});

describe('shops, members and invites', () => {
  test('a shop is invisible to non-members', async () => {
    const owner = await signIn('owner@shop.vn');
    const stranger = await signIn('stranger@x.vn');
    const shop = await createShop(owner);
    expect((await call('GET', `/shops/${shop.id}`, stranger)).status).toBe(404);
    expect((await call('GET', `/shops/${shop.id}/orders`, stranger)).status).toBe(404);
    expect((await call('POST', `/shops/${shop.id}/orders`, stranger, order())).status).toBe(404);
  });

  test('an invited manager shares the shop data but cannot delete the shop', async () => {
    const owner = await signIn('owner@shop.vn');
    const manager = await signIn('manager@shop.vn');
    const shop = await createShop(owner);
    const invite = await call('POST', `/shops/${shop.id}/invites`, owner);
    expect(invite.body.code).toMatch(/^[A-Z2-9]{6}$/);

    const preview = await call('GET', `/invites/${invite.body.code.toLowerCase()}`, manager);
    expect(preview.body).toMatchObject({ shopName: 'Tiệm hoa Mộc', alreadyMember: false });

    const accepted = await call('POST', `/invites/${invite.body.code}/accept`, manager);
    expect(accepted.body.shops).toEqual([{ id: shop.id, name: 'Tiệm hoa Mộc', businessType: 'flower', role: 'manager' }]);

    const created = await call<OrderDetail>('POST', `/shops/${shop.id}/orders`, owner, order());
    const seen = await call<OrderDetail>('GET', `/shops/${shop.id}/orders/${created.body.id}`, manager);
    expect(seen.status).toBe(200);

    // Manager updates the order; the owner sees who did it.
    await call('POST', `/shops/${shop.id}/orders/${created.body.id}/status`, manager, { status: 'in_progress' });
    await call('PATCH', '/me', manager, { name: 'Lan' });
    await call('POST', `/shops/${shop.id}/orders/${created.body.id}/status`, manager, { status: 'delivering' });
    const detail = await call<OrderDetail>('GET', `/shops/${shop.id}/orders/${created.body.id}`, owner);
    expect(detail.body.status).toBe('delivering');
    expect(detail.body.events[0]).toMatchObject({ type: 'status', toStatus: 'delivering', actorName: 'Lan' });

    expect((await call('DELETE', `/shops/${shop.id}`, manager)).status).toBe(403);
    const members = await call('GET', `/shops/${shop.id}/members`, owner);
    const ownerId = members.body.find((m: { role: string }) => m.role === 'owner').userId;
    expect((await call('DELETE', `/shops/${shop.id}/members/${ownerId}`, manager)).status).toBe(403);
  });

  test('removed members lose access; the last owner cannot leave', async () => {
    const owner = await signIn('owner@shop.vn');
    const manager = await signIn('manager@shop.vn');
    const shop = await createShop(owner);
    const { body: inv } = await call('POST', `/shops/${shop.id}/invites`, owner);
    await call('POST', `/invites/${inv.code}/accept`, manager);
    const members = (await call('GET', `/shops/${shop.id}/members`, owner)).body;
    const managerId = members.find((m: { role: string }) => m.role === 'manager').userId;
    const ownerId = members.find((m: { role: string }) => m.role === 'owner').userId;

    expect((await call('DELETE', `/shops/${shop.id}/members/${ownerId}`, owner)).status).toBe(409);
    expect((await call('DELETE', `/shops/${shop.id}/members/${managerId}`, owner)).status).toBe(200);
    expect((await call('GET', `/shops/${shop.id}`, manager)).status).toBe(404);
  });

  test('revoked and expired invites stop working', async () => {
    const owner = await signIn('owner@shop.vn');
    const other = await signIn('other@shop.vn');
    const shop = await createShop(owner);
    const { body: a } = await call('POST', `/shops/${shop.id}/invites`, owner);
    await call('DELETE', `/shops/${shop.id}/invites/${a.id}`, owner);
    expect((await call('POST', `/invites/${a.code}/accept`, other)).status).toBe(410);

    const { body: b } = await call('POST', `/shops/${shop.id}/invites`, owner);
    clock += 8 * 24 * 60 * 60 * 1000;
    expect((await call('POST', `/invites/${b.code}/accept`, other)).status).toBe(410);
  });
});

describe('orders', () => {
  let token: string;
  let shopId: string;

  beforeEach(async () => {
    token = await signIn('owner@shop.vn');
    shopId = (await createShop(token)).id;
  });

  test('totals, numbering and customer linking', async () => {
    const first = await call<OrderDetail>('POST', `/shops/${shopId}/orders`, token, order());
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      number: 1,
      status: 'new',
      customerPhone: '0909123456',
      itemsTotal: 680_000,
      total: 700_000,
      paid: 0,
    });
    expect(first.body.items.map((i) => i.name)).toEqual(['Bó hồng đỏ 20 cành', 'Thiệp']);

    // Same phone links to the same customer.
    const second = await call<OrderDetail>('POST', `/shops/${shopId}/orders`, token, order({ customerName: 'Thảo' }));
    expect(second.body.number).toBe(2);
    expect(second.body.customerId).toBe(first.body.customerId);

    const customers = await call<Customer[]>('GET', `/shops/${shopId}/customers`, token);
    expect(customers.body).toHaveLength(1);
    expect(customers.body[0]).toMatchObject({ name: 'Chị Thảo', orderCount: 2, totalSpent: 1_400_000, owed: 1_400_000 });
    await call('POST', `/shops/${shopId}/orders/${first.body.id}/payments`, token, { amount: 700_000 });
    const after = await call<Customer[]>('GET', `/shops/${shopId}/customers`, token);
    expect(after.body[0].owed).toBe(700_000);

    // Walk-in without contact details creates no customer.
    const walkIn = await call<OrderDetail>('POST', `/shops/${shopId}/orders`, token, {
      ...order({ customerName: null, customerPhone: null, fulfillment: 'pickup' }),
    });
    expect(walkIn.body.customerId).toBeNull();
    expect(walkIn.body.address).toBeNull();
  });

  test('invalid input returns a Vietnamese message', async () => {
    const res = await call('POST', `/shops/${shopId}/orders`, token, order({ items: [] }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Thêm ít nhất một sản phẩm');
    const times = await call('POST', `/shops/${shopId}/orders`, token, order({ timeFrom: '10:00', timeTo: '09:00' }));
    expect(times.body.error.message).toBe('Giờ kết thúc phải sau giờ bắt đầu');
  });

  test('a deposit can be taken when the order is created', async () => {
    const res = await call<OrderDetail>('POST', `/shops/${shopId}/orders`, token, { ...order(), deposit: 200_000 });
    expect(res.body.paid).toBe(200_000);
    expect(res.body.events.map((e) => e.type)).toEqual(['payment', 'created']);
    const tooMuch = await call('POST', `/shops/${shopId}/orders`, token, { ...order(), deposit: 900_000 });
    expect(tooMuch.status).toBe(400);
  });

  test('payments cannot exceed the total or go negative', async () => {
    const { body: o } = await call<OrderDetail>('POST', `/shops/${shopId}/orders`, token, order());
    const deposit = await call<OrderDetail>('POST', `/shops/${shopId}/orders/${o.id}/payments`, token, {
      amount: 300_000,
      note: 'Cọc',
    });
    expect(deposit.body.paid).toBe(300_000);
    expect(deposit.body.events[0]).toMatchObject({ type: 'payment', amount: 300_000 });
    expect((await call('POST', `/shops/${shopId}/orders/${o.id}/payments`, token, { amount: 500_000 })).status).toBe(400);
    expect((await call('POST', `/shops/${shopId}/orders/${o.id}/payments`, token, { amount: -400_000 })).status).toBe(400);

    // Editing the order below what was paid is refused.
    const cheaper = order({ items: [{ name: 'Hoa nhỏ', quantity: 1, unitPrice: 100_000 }] });
    expect((await call('PUT', `/shops/${shopId}/orders/${o.id}`, token, cheaper)).status).toBe(409);
  });

  test('board splits overdue, today and the next 7 days', async () => {
    await call('POST', `/shops/${shopId}/orders`, token, order({ dueDate: '2026-11-07' }));
    const done = await call<OrderDetail>('POST', `/shops/${shopId}/orders`, token, order({ dueDate: '2026-11-08' }));
    await call('POST', `/shops/${shopId}/orders/${done.body.id}/status`, token, { status: 'delivered' });
    await call('POST', `/shops/${shopId}/orders`, token, order({ dueDate: '2026-11-09', timeFrom: '14:00', timeTo: null }));
    await call('POST', `/shops/${shopId}/orders`, token, order({ dueDate: '2026-11-09', timeFrom: null, timeTo: null }));
    await call('POST', `/shops/${shopId}/orders`, token, order({ dueDate: '2026-11-12' }));
    await call('POST', `/shops/${shopId}/orders`, token, order({ dueDate: '2026-11-30' }));

    const { body } = await call<Board>('GET', `/shops/${shopId}/board?today=2026-11-09`, token);
    expect(body.overdue.map((o) => o.dueDate)).toEqual(['2026-11-07']);
    expect(body.today.map((o) => o.timeFrom)).toEqual(['14:00', null]);
    expect(body.upcoming.map((o) => o.dueDate)).toEqual(['2026-11-12']);
  });

  test('search by name, phone and order number', async () => {
    await call('POST', `/shops/${shopId}/orders`, token, order());
    await call('POST', `/shops/${shopId}/orders`, token, order({ customerName: 'Anh Minh', customerPhone: '0987000111' }));
    const byName = await call('GET', `/shops/${shopId}/orders?q=Minh`, token);
    expect(byName.body).toHaveLength(1);
    const byNumber = await call('GET', `/shops/${shopId}/orders?q=%231`, token);
    expect(byNumber.body.map((o: { number: number }) => o.number)).toEqual([1]);
    const byPhone = await call('GET', `/shops/${shopId}/orders?q=0987`, token);
    expect(byPhone.body).toHaveLength(1);
  });
});
