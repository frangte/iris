import { createApp } from './app';
import { openDatabase } from './db';
import { mailerFromEnv } from './mailer';
import { BunHub, type SocketData } from './realtime';

const env = process.env;
const production = env.NODE_ENV === 'production';
// Opt-in only: echoing codes lets anyone sign in as anyone.
const echo = !production && env.OTP_DEV_ECHO === '1';
const db = openDatabase(env.DB_PATH ?? new URL('../data/floied.db', import.meta.url).pathname);
const hub = new BunHub(db);
const app = createApp({
  db,
  mailer: mailerFromEnv(env),
  hub,
  devEchoOtp: echo,
});

const server = Bun.serve<SocketData>({
  port: Number(env.PORT ?? 8787),
  hostname: env.HOST ?? '0.0.0.0',
  fetch(req, srv) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const userId = hub.authenticate(url.searchParams.get('token'));
      if (!userId) return new Response('Unauthorized', { status: 401 });
      if (srv.upgrade(req, { data: { userId } })) return undefined;
      return new Response('Upgrade failed', { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: hub.handlers,
});
hub.attach(server);

console.log(`[floied] API on http://${server.hostname}:${server.port}${echo ? ' (dev: OTP echoed in responses)' : ''}`);
