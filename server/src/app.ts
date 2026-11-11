import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { ApiErrorBody } from '../../shared/domain';
import { authRoutes } from './auth';
import type { AppEnv, Deps } from './context';
import { orderRoutes } from './orders';
import { shopRoutes } from './shops';
import { ApiError } from './util';

export function createApp(deps: Deps) {
  const app = new Hono<AppEnv>();

  // Bearer tokens, no cookies: any origin may call the API.
  app.use('*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type'], maxAge: 86400 }));

  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/', authRoutes(deps));
  app.route('/', shopRoutes(deps));
  app.route('/', orderRoutes(deps));

  app.notFound((c) => c.json<ApiErrorBody>({ error: { code: 'not_found', message: 'Không tìm thấy' } }, 404));

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json<ApiErrorBody>({ error: { code: err.code, message: err.message } }, err.status);
    }
    if (err instanceof HTTPException) {
      return c.json<ApiErrorBody>({ error: { code: 'http_error', message: err.message } }, err.status);
    }
    console.error('[api] unhandled', err);
    return c.json<ApiErrorBody>({ error: { code: 'internal', message: 'Có lỗi xảy ra, thử lại sau' } }, 500);
  });

  return app;
}
