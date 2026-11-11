import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import {
  shopCreateSchema,
  shopUpdateSchema,
  type Invite,
  type InvitePreview,
  type Member,
  type Role,
  type Shop,
} from '../../shared/domain';
import { listUserShops, requireAuth } from './auth';
import type { AppEnv, Deps } from './context';
import type { DB } from './db';
import { ApiError, forbidden, inviteCode, notFound, parse, readJson, uuid } from './util';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Loads the caller's membership for `:shopId`. Non-members get 404, not 403,
 * so shop ids cannot be probed.
 */
export function requireMember(deps: Deps, roles?: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const shopId = c.req.param('shopId');
    const user = c.get('user');
    const row = shopId
      ? (deps.db.query('SELECT role FROM shop_members WHERE shop_id = ? AND user_id = ?').get(shopId, user.id) as {
          role: Role;
        } | null)
      : null;
    if (!row || !shopId) throw notFound('Không tìm thấy shop');
    if (roles && !roles.includes(row.role)) throw forbidden();
    c.set('member', { shopId, role: row.role });
    await next();
  });
}

function getShop(db: DB, shopId: string, role: Role): Shop {
  const row = db
    .query(
      `SELECT id, name, business_type AS businessType, phone, address,
              bank_bin AS bankBin, bank_account_no AS bankAccountNo, bank_account_name AS bankAccountName,
              created_at AS createdAt
         FROM shops WHERE id = ?`,
    )
    .get(shopId) as Omit<Shop, 'role'> | null;
  if (!row) throw notFound('Không tìm thấy shop');
  return { ...row, role };
}

function listMembers(db: DB, shopId: string): Member[] {
  return db
    .query(
      `SELECT u.id AS userId, u.email, u.name, m.role, m.joined_at AS joinedAt
         FROM shop_members m JOIN users u ON u.id = m.user_id
        WHERE m.shop_id = ?
        ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.joined_at`,
    )
    .all(shopId) as Member[];
}

function findInvite(db: DB, code: string, nowIso: string) {
  return db
    .query(
      `SELECT i.id, i.shop_id AS shopId, s.name AS shopName, u.name AS inviterName, u.email AS inviterEmail
         FROM shop_invites i
         JOIN shops s ON s.id = i.shop_id
         LEFT JOIN users u ON u.id = i.created_by
        WHERE i.code = ? AND i.revoked_at IS NULL AND i.expires_at > ?`,
    )
    .get(code.trim().toUpperCase(), nowIso) as {
    id: string;
    shopId: string;
    shopName: string;
    inviterName: string | null;
    inviterEmail: string | null;
  } | null;
}

export function shopRoutes(deps: Deps) {
  const { db, hub } = deps;
  const now = () => deps.now?.() ?? Date.now();
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps);
  const member = requireMember(deps);
  const owner = requireMember(deps, ['owner']);

  app.post('/shops', auth, async (c) => {
    const input = parse(shopCreateSchema, await readJson(c.req));
    const user = c.get('user');
    const id = uuid();
    db.transaction(() => {
      db.query('INSERT INTO shops (id, name, business_type, phone, address, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        input.name,
        input.businessType,
        input.phone,
        input.address,
        user.id,
      );
      db.query("INSERT INTO shop_members (shop_id, user_id, role) VALUES (?, ?, 'owner')").run(id, user.id);
    })();
    return c.json(getShop(db, id, 'owner'), 201);
  });

  app.get('/shops/:shopId', auth, member, (c) => {
    const m = c.get('member');
    return c.json(getShop(db, m.shopId, m.role));
  });

  app.patch('/shops/:shopId', auth, member, async (c) => {
    const input = parse(shopUpdateSchema, await readJson(c.req));
    const m = c.get('member');
    const columns: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      address: 'address',
      bankBin: 'bank_bin',
      bankAccountNo: 'bank_account_no',
      bankAccountName: 'bank_account_name',
    };
    const sets: string[] = [];
    const values: (string | null)[] = [];
    for (const [key, column] of Object.entries(columns)) {
      const value = input[key as keyof typeof input];
      if (value !== undefined) {
        sets.push(`${column} = ?`);
        values.push(value);
      }
    }
    if (sets.length) db.query(`UPDATE shops SET ${sets.join(', ')} WHERE id = ?`).run(...values, m.shopId);
    hub.publish(m.shopId, { type: 'changed', shopId: m.shopId, entity: 'shop' });
    return c.json(getShop(db, m.shopId, m.role));
  });

  app.delete('/shops/:shopId', auth, owner, (c) => {
    const { shopId } = c.get('member');
    const members = listMembers(db, shopId);
    db.query('DELETE FROM shops WHERE id = ?').run(shopId);
    for (const mem of members) {
      hub.unsubscribe(mem.userId, shopId);
      hub.notifyUser(mem.userId, { type: 'membership' });
    }
    return c.json({ ok: true });
  });

  // ---- members ----

  app.get('/shops/:shopId/members', auth, member, (c) => c.json(listMembers(db, c.get('member').shopId)));

  app.delete('/shops/:shopId/members/:userId', auth, member, (c) => {
    const m = c.get('member');
    const me = c.get('user');
    const target = c.req.param('userId');
    const leaving = target === me.id;
    if (!leaving && m.role !== 'owner') throw forbidden('Chỉ chủ shop mới xoá được thành viên');
    const row = db.query('SELECT role FROM shop_members WHERE shop_id = ? AND user_id = ?').get(m.shopId, target) as {
      role: Role;
    } | null;
    if (!row) throw notFound('Không tìm thấy thành viên');
    if (row.role === 'owner') {
      const owners = db
        .query("SELECT COUNT(*) AS n FROM shop_members WHERE shop_id = ? AND role = 'owner'")
        .get(m.shopId) as { n: number };
      if (owners.n <= 1) {
        throw new ApiError(409, 'last_owner', 'Shop cần ít nhất một chủ. Hãy xoá shop nếu không dùng nữa');
      }
    }
    db.query('DELETE FROM shop_members WHERE shop_id = ? AND user_id = ?').run(m.shopId, target);
    hub.unsubscribe(target, m.shopId);
    hub.notifyUser(target, { type: 'membership' });
    hub.publish(m.shopId, { type: 'changed', shopId: m.shopId, entity: 'member', id: target });
    return c.json({ ok: true });
  });

  // ---- invites ----

  app.get('/shops/:shopId/invites', auth, member, (c) => {
    const rows = db
      .query(
        `SELECT id, code, created_by AS createdBy, expires_at AS expiresAt, uses, created_at AS createdAt
           FROM shop_invites
          WHERE shop_id = ? AND revoked_at IS NULL AND expires_at > ?
          ORDER BY created_at DESC`,
      )
      .all(c.get('member').shopId, new Date(now()).toISOString()) as Invite[];
    return c.json(rows);
  });

  app.post('/shops/:shopId/invites', auth, member, (c) => {
    const { shopId } = c.get('member');
    const user = c.get('user');
    const id = uuid();
    const expiresAt = new Date(now() + INVITE_TTL_MS).toISOString();
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = inviteCode();
      const taken = db.query('SELECT 1 FROM shop_invites WHERE code = ?').get(code);
      if (!taken) break;
    }
    db.query('INSERT INTO shop_invites (id, shop_id, code, created_by, expires_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      shopId,
      code,
      user.id,
      expiresAt,
    );
    hub.publish(shopId, { type: 'changed', shopId, entity: 'invite', id });
    const invite: Invite = { id, code, createdBy: user.id, expiresAt, uses: 0, createdAt: new Date(now()).toISOString() };
    return c.json(invite, 201);
  });

  app.delete('/shops/:shopId/invites/:inviteId', auth, member, (c) => {
    const { shopId } = c.get('member');
    const res = db
      .query('UPDATE shop_invites SET revoked_at = ? WHERE id = ? AND shop_id = ? AND revoked_at IS NULL')
      .run(new Date(now()).toISOString(), c.req.param('inviteId'), shopId);
    if (res.changes === 0) throw notFound('Không tìm thấy lời mời');
    hub.publish(shopId, { type: 'changed', shopId, entity: 'invite' });
    return c.json({ ok: true });
  });

  app.get('/invites/:code', auth, (c) => {
    const inv = findInvite(db, c.req.param('code'), new Date(now()).toISOString());
    if (!inv) throw new ApiError(410, 'invite_invalid', 'Mã mời không đúng hoặc đã hết hạn');
    const already = db
      .query('SELECT 1 FROM shop_members WHERE shop_id = ? AND user_id = ?')
      .get(inv.shopId, c.get('user').id);
    const body: InvitePreview = {
      code: c.req.param('code').toUpperCase(),
      shopId: inv.shopId,
      shopName: inv.shopName,
      invitedBy: inv.inviterName ?? inv.inviterEmail,
      alreadyMember: Boolean(already),
    };
    return c.json(body);
  });

  app.post('/invites/:code/accept', auth, (c) => {
    const user = c.get('user');
    const inv = findInvite(db, c.req.param('code'), new Date(now()).toISOString());
    if (!inv) throw new ApiError(410, 'invite_invalid', 'Mã mời không đúng hoặc đã hết hạn');
    const joined = db.transaction(() => {
      const res = db
        .query("INSERT OR IGNORE INTO shop_members (shop_id, user_id, role) VALUES (?, ?, 'manager')")
        .run(inv.shopId, user.id);
      if (res.changes > 0) db.query('UPDATE shop_invites SET uses = uses + 1 WHERE id = ?').run(inv.id);
      return res.changes > 0;
    })();
    if (joined) hub.publish(inv.shopId, { type: 'changed', shopId: inv.shopId, entity: 'member', id: user.id });
    return c.json({ shopId: inv.shopId, shops: listUserShops(db, user.id) });
  });

  return app;
}
