import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Me, ShopSummary } from '@shared/domain';
import { api, ApiError, setApiToken, setUnauthorizedHandler } from './api';
import { storage } from './storage';

const TOKEN_KEY = 'floied.token';
const SHOP_KEY = 'floied.shop';
const PENDING_INVITE_KEY = 'floied.pendingInvite';

type SessionState = {
  /** True until the stored token has been read. */
  booting: boolean;
  signedIn: boolean;
  me: Me | undefined;
  meError: unknown;
  shop: ShopSummary | null;
  selectShop: (shopId: string) => void;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<Me | undefined>;
  pendingInvite: string | null;
  setPendingInvite: (code: string | null) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [pendingInvite, setPendingInviteState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [t, s, p] = await Promise.all([storage.get(TOKEN_KEY), storage.get(SHOP_KEY), storage.get(PENDING_INVITE_KEY)]);
      setApiToken(t);
      setToken(t);
      setShopId(s);
      setPendingInviteState(p);
      setBooting(false);
    })();
  }, []);

  const signOut = useCallback(async () => {
    const hadToken = Boolean(token);
    setApiToken(null);
    setToken(null);
    queryClient.clear();
    await storage.remove(TOKEN_KEY);
    if (hadToken) api.logout().catch(() => {});
  }, [queryClient, token]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setApiToken(null);
      setToken(null);
      queryClient.clear();
      storage.remove(TOKEN_KEY);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: Boolean(token),
    retry: (count, err) => !(err instanceof ApiError && err.status === 401) && count < 2,
  });

  const signIn = useCallback(
    async (next: string) => {
      setApiToken(next);
      await storage.set(TOKEN_KEY, next);
      setToken(next);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    [queryClient],
  );

  const selectShop = useCallback((id: string) => {
    setShopId(id);
    storage.set(SHOP_KEY, id);
  }, []);

  const setPendingInvite = useCallback((code: string | null) => {
    setPendingInviteState(code);
    if (code) storage.set(PENDING_INVITE_KEY, code);
    else storage.remove(PENDING_INVITE_KEY);
  }, []);

  const me = meQuery.data;
  // Fall back to the first shop when the remembered one is gone (left, removed, deleted).
  const shop = useMemo(() => {
    if (!me) return null;
    return me.shops.find((s) => s.id === shopId) ?? me.shops[0] ?? null;
  }, [me, shopId]);

  const value: SessionState = {
    booting: booting || (Boolean(token) && meQuery.isPending),
    signedIn: Boolean(token),
    me,
    meError: meQuery.error,
    shop,
    selectShop,
    signIn,
    signOut,
    refreshMe: async () => (await meQuery.refetch()).data,
    pendingInvite,
    setPendingInvite,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}

/** For screens that only render inside a shop. */
export function useShop(): ShopSummary {
  const { shop } = useSession();
  if (!shop) throw new Error('useShop without a selected shop');
  return shop;
}
