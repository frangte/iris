import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, ErrorNote, Loading, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Space } from '@/lib/theme';

/** Opened from an invite link (floied://join/CODE) or the code field. */
export default function Join() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const { signedIn, setPendingInvite, selectShop, refreshMe } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Signed out: remember the code, sign in, then onboarding offers it again.
  useEffect(() => {
    if (!signedIn && code) {
      setPendingInvite(code);
      router.replace('/sign-in');
    }
  }, [signedIn, code, setPendingInvite]);

  const preview = useQuery({ queryKey: ['invite', code], queryFn: () => api.previewInvite(code), enabled: signedIn && Boolean(code), retry: false });

  if (!signedIn) return null;
  if (preview.isPending) return <Loading />;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.acceptInvite(code);
      setPendingInvite(null);
      selectShop(res.shopId);
      await refreshMe();
      router.dismissTo('/');
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  if (preview.error) {
    return (
      <Screen>
        <ErrorNote error={preview.error} />
        <Button
          title="Đóng"
          variant="plain"
          onPress={() => {
            setPendingInvite(null);
            router.back();
          }}
          style={{ marginTop: Space.lg }}
        />
      </Screen>
    );
  }

  const p = preview.data!;
  return (
    <Screen>
      <Section title="Bạn được mời vào" footer="Quản lý xem và sửa được mọi đơn, khách và tiền của shop.">
        <Row title={<T variant="title3">{p.shopName}</T>} subtitle={p.invitedBy ? `Mời bởi ${p.invitedBy}` : undefined} icon="storefront" />
        <Row title="Vai trò" detail="Quản lý" />
      </Section>
      {p.alreadyMember ? (
        <Button
          title="Bạn đã ở trong shop này, mở shop"
          onPress={() => {
            selectShop(p.shopId);
            setPendingInvite(null);
            router.dismissTo('/');
          }}
          style={{ marginTop: Space.lg }}
        />
      ) : (
        <Button title={`Vào ${p.shopName}`} onPress={accept} loading={busy} style={{ marginTop: Space.lg }} />
      )}
      {error ? <ErrorNote error={error} /> : null}
    </Screen>
  );
}
