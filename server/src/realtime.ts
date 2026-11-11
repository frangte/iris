import type { Server, ServerWebSocket } from 'bun';
import type { RealtimeEvent } from '../../shared/domain';
import { findSession } from './auth';
import type { Hub } from './context';
import type { DB } from './db';

export type SocketData = { userId: string };

const shopTopic = (shopId: string) => `shop:${shopId}`;

/**
 * Bun-native pub/sub. Each socket belongs to one user and subscribes to the
 * shops that user is a member of, on request.
 */
export class BunHub implements Hub {
  private server: Server<SocketData> | null = null;
  private sockets = new Map<string, Set<ServerWebSocket<SocketData>>>();

  constructor(private readonly db: DB) {}

  attach(server: Server<SocketData>) {
    this.server = server;
  }

  publish(shopId: string, event: RealtimeEvent) {
    this.server?.publish(shopTopic(shopId), JSON.stringify(event));
  }

  notifyUser(userId: string, event: RealtimeEvent) {
    const msg = JSON.stringify(event);
    for (const ws of this.sockets.get(userId) ?? []) ws.send(msg);
  }

  unsubscribe(userId: string, shopId: string) {
    for (const ws of this.sockets.get(userId) ?? []) ws.unsubscribe(shopTopic(shopId));
  }

  /** Returns the user id for a valid token, so the upgrade can carry it. */
  authenticate(token: string | null): string | null {
    if (!token) return null;
    return findSession(this.db, token, Date.now())?.user.id ?? null;
  }

  handlers = {
    open: (ws: ServerWebSocket<SocketData>) => {
      const set = this.sockets.get(ws.data.userId) ?? new Set();
      set.add(ws);
      this.sockets.set(ws.data.userId, set);
    },
    close: (ws: ServerWebSocket<SocketData>) => {
      const set = this.sockets.get(ws.data.userId);
      set?.delete(ws);
      if (set && set.size === 0) this.sockets.delete(ws.data.userId);
    },
    message: (ws: ServerWebSocket<SocketData>, raw: string | Buffer) => {
      let msg: { type?: string; shopId?: string };
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' } satisfies RealtimeEvent));
        return;
      }
      if (msg.type === 'subscribe' && typeof msg.shopId === 'string') {
        // Drop every other shop: a socket follows the shop on screen.
        for (const topic of ws.subscriptions ?? []) if (topic.startsWith('shop:')) ws.unsubscribe(topic);
        const isMember = this.db
          .query('SELECT 1 FROM shop_members WHERE shop_id = ? AND user_id = ?')
          .get(msg.shopId, ws.data.userId);
        if (isMember) ws.subscribe(shopTopic(msg.shopId));
      }
    },
  };
}
