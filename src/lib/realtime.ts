import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import type { RealtimeEvent } from '@shared/domain';
import { getApiToken, wsUrl } from './api';

/**
 * Keeps one WebSocket open while signed in and refetches whatever another
 * member just changed. Reconnects with backoff and on returning to the app.
 */
export function useRealtime(shopId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const shopRef = useRef(shopId);
  const socketRef = useRef<WebSocket | null>(null);

  // Follow the shop on screen without reconnecting.
  useEffect(() => {
    shopRef.current = shopId;
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN && shopId) ws.send(JSON.stringify({ type: 'subscribe', shopId }));
  }, [shopId]);

  useEffect(() => {
    if (!enabled) return;
    let closed = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    const connect = () => {
      if (closed || !getApiToken()) return;
      const ws = new WebSocket(wsUrl());
      socketRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        if (shopRef.current) ws.send(JSON.stringify({ type: 'subscribe', shopId: shopRef.current }));
        // Anything may have changed while we were offline.
        queryClient.invalidateQueries();
        pingTimer = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"type":"ping"}'), 25_000);
      };
      ws.onmessage = (e) => {
        let event: RealtimeEvent;
        try {
          event = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (event.type === 'changed') {
          queryClient.invalidateQueries({ queryKey: ['shop', event.shopId] });
        } else if (event.type === 'membership') {
          queryClient.invalidateQueries({ queryKey: ['me'] });
        }
      };
      ws.onclose = () => {
        clearInterval(pingTimer);
        if (socketRef.current === ws) socketRef.current = null;
        if (closed) return;
        const delay = Math.min(30_000, 1000 * 2 ** retry++);
        retryTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };

    connect();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !socketRef.current) {
        clearTimeout(retryTimer);
        retry = 0;
        connect();
      }
    });

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      sub.remove();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, queryClient]);
}
