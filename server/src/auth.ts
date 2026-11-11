import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { otpRequestSchema, otpVerifySchema, profileUpdateSchema, type Me, type ShopSummary } from '../../shared/domain';
import type { AppEnv, Deps, UserRow } from './context';
import type { DB } from './db';
import { ApiError, otpCode, parse, randomToken, readJson, safeEqual, sha256, uuid } from './util';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_GAP_MS = 30 * 1000;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function findSession(db: DB, token: string, now: number): { user: UserRow; sessionId: string } | null {
  const row = db
    .query(
      `SELECT s.id AS sessionId, s.expires_at AS expiresAt, s.last_seen_at AS lastSeenAt,
              u.id, u.email, u.name
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as
    | { sessionId: string; expiresAt: number; lastSeenAt: number; id: string; email: string; name: string | null }
    | null;
  if (!row || row.expiresAt < now) return null;
  // Sliding expiry, written at most once an hour to keep reads cheap.
  if (now - row.lastSeenAt > 60 * 60 * 1000) {
    db.query('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?').run(
      now,
      now + SESSION_TTL_MS,
      row.sessionId,
    );
  }
  return { sessionId: row.sessionId, user: { id: row.id, email: row.email, name: row.name } };
}

export function requireAuth(deps: Deps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const found = token ? findSession(deps.db, token, deps.now?.() ?? Date.now()) : null;
    if (!found) throw new ApiError(401, 'unauthenticated', 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
    c.set('user', found.user);
    c.set('sessionId', found.sessionId);
    await next();
  });
}

export function listUserShops(db: DB, userId: string): ShopSummary[] {
  return db
    .query(
      `SELECT s.id, s.name, s.business_type AS businessType, m.role
         FROM shop_members m JOIN shops s ON s.id = m.shop_id
        WHERE m.user_id = ?
        ORDER BY m.joined_at`,
    )
    .all(userId) as ShopSummary[];
}

export function authRoutes(deps: Deps) {
  const { db, mailer } = deps;
  const now = () => deps.now?.() ?? Date.now();
  const app = new Hono<AppEnv>();

  app.post('/auth/otp', async (c) => {
    const { email } = parse(otpRequestSchema, await readJson(c.req));
    const t = now();
    const recent = db
      .query('SELECT created_at AS createdAt FROM otp_codes WHERE email = ? AND created_at > ? ORDER BY created_at DESC')
      .all(email, t - 60 * 60 * 1000) as { createdAt: number }[];
    if (recent[0] && t - recent[0].createdAt < OTP_RESEND_GAP_MS) {
      throw new ApiError(429, 'otp_too_soon', 'Vui lòng đợi 30 giây rồi gửi lại mã');
    }
    if (recent.length >= OTP_MAX_PER_HOUR) {
      throw new ApiError(429, 'otp_rate_limited', 'Bạn đã yêu cầu quá nhiều mã, thử lại sau một giờ');
    }
    const code = otpCode();
    db.query('INSERT INTO otp_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      email,
      sha256(`${email}:${code}`),
      t + OTP_TTL_MS,
      t,
    );
    db.query('DELETE FROM otp_codes WHERE created_at < ?').run(t - 24 * 60 * 60 * 1000);
    try {
      await mailer.sendOtp(email, code);
    } catch (err) {
      console.error('[otp] send failed', err);
      throw new ApiError(500, 'otp_send_failed', 'Không gửi được email, thử lại sau');
    }
    return c.json(deps.devEchoOtp ? { ok: true, devCode: code } : { ok: true });
  });

  app.post('/auth/verify', async (c) => {
    const { email, code } = parse(otpVerifySchema, await readJson(c.req));
    const t = now();
    const otp = db
      .query(
        'SELECT id, code_hash AS codeHash, attempts FROM otp_codes WHERE email = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
      )
      .get(email, t) as { id: number; codeHash: string; attempts: number } | null;
    if (!otp) throw new ApiError(400, 'otp_expired', 'Mã đã hết hạn, hãy gửi lại mã mới');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new ApiError(429, 'otp_locked', 'Nhập sai quá nhiều lần, hãy gửi lại mã mới');
    }
    if (!safeEqual(otp.codeHash, sha256(`${email}:${code}`))) {
      db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(otp.id);
      throw new ApiError(400, 'otp_invalid', 'Mã không đúng');
    }

    const token = randomToken();
    const user = db.transaction(() => {
      db.query('DELETE FROM otp_codes WHERE email = ?').run(email);
      let u = db.query('SELECT id, email, name FROM users WHERE email = ?').get(email) as UserRow | null;
      if (!u) {
        u = { id: uuid(), email, name: null };
        db.query('INSERT INTO users (id, email) VALUES (?, ?)').run(u.id, email);
      }
      db.query(
        'INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(uuid(), sha256(token), u.id, t + SESSION_TTL_MS, t, t);
      return u;
    })();
    return c.json({ token, user });
  });

  app.post('/auth/logout', requireAuth(deps), (c) => {
    db.query('DELETE FROM sessions WHERE id = ?').run(c.get('sessionId'));
    return c.json({ ok: true });
  });

  app.get('/me', requireAuth(deps), (c) => {
    const user = c.get('user');
    const body: Me = { user, shops: listUserShops(db, user.id) };
    return c.json(body);
  });

  app.patch('/me', requireAuth(deps), async (c) => {
    const { name } = parse(profileUpdateSchema, await readJson(c.req));
    const user = c.get('user');
    db.query('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
    return c.json({ user: { ...user, name } });
  });

  return app;
}
