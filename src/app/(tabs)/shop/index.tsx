import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorNote, Field, Row, Screen, Section, T, tabRootHeader, WebTitle } from '@/components/ui';
import { api } from '@/lib/api';
import { confirm } from '@/lib/dialog';
import { useMembers, useShopDetail } from '@/lib/queries';
import { useSession, useShop } from '@/lib/session';
import { Space } from '@/lib/theme';
import { bankShortName } from '@/lib/vietqr';

const ROLE_LABEL = { owner: 'Chủ shop', manager: 'Quản lý' } as const;

export default function ShopTab() {
  const shop = useShop();
  const detail = useShopDetail();
  const members = useMembers();
  const { me, selectShop, signOut } = useSession();
  const [code, setCode] = useState('');

  const bank = detail.data?.bankBin ? `${bankShortName(detail.data.bankBin) ?? ''} · ${detail.data.bankAccountNo ?? ''}` : 'Chưa có';

  return (
    <>
      <Stack.Screen options={{ title: 'Shop', ...tabRootHeader }} />
      <Screen refreshing={detail.isRefetching} onRefresh={() => (detail.refetch(), members.refetch())}>
        <WebTitle title="Shop" />
        <Section>
          <Row title={<T variant="title3">{shop.name}</T>} subtitle={ROLE_LABEL[shop.role]} icon="storefront" />
          <Row title="Thông tin shop" subtitle="Tên, điện thoại, địa chỉ lấy hàng" chevron onPress={() => router.push('/shop/info')} />
          <Row title="Chuyển khoản & VietQR" detail={bank} chevron onPress={() => router.push('/shop/payment')} />
        </Section>

        <Section title="Cùng quản lý" footer="Mọi người trong shop thấy cùng một sổ đơn, cập nhật ngay khi ai đó thay đổi.">
          <Row
            icon="people"
            title="Thành viên"
            detail={members.data ? `${members.data.length} người` : ''}
            chevron
            onPress={() => router.push('/shop/members')}
          />
        </Section>

        {me && me.shops.length > 1 ? (
          <Section title="Đổi shop">
            {me.shops.map((s) => (
              <Row
                key={s.id}
                title={s.name}
                subtitle={ROLE_LABEL[s.role]}
                detail={s.id === shop.id ? <T tone="tint" variant="subhead">Đang mở</T> : undefined}
                onPress={s.id === shop.id ? undefined : () => selectShop(s.id)}
              />
            ))}
          </Section>
        ) : null}

        <Section title="Shop khác">
          <Row icon="plus" title={<T tone="tint">Mở thêm shop</T>} onPress={() => router.push('/shop/new')} />
          <Field
            label="Mã mời"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="Nhập mã để vào shop khác"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => code.trim().length >= 4 && router.push(`/join/${code.trim()}`)}
          />
        </Section>

        <AccountName key={me?.user.name ?? ''} saved={me?.user.name ?? ''} email={me?.user.email ?? ''} />

        <Button
          title="Đăng xuất"
          variant="destructive"
          icon="logout"
          style={{ marginTop: Space.xxl }}
          onPress={async () => {
            if (await confirm({ title: 'Đăng xuất?', confirm: 'Đăng xuất', destructive: true })) signOut();
          }}
        />
        <T variant="caption" tone="tertiary" style={{ textAlign: 'center', marginTop: Space.lg }}>
          Floied · bản thử nghiệm
        </T>
      </Screen>
    </>
  );
}

/** Keyed by the saved name, so a change from elsewhere resets the field. */
function AccountName({ saved, email }: { saved: string; email: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState(saved);
  const [error, setError] = useState<unknown>(null);
  const save = async () => {
    const n = name.trim();
    if (!n || n === saved) return;
    try {
      setError(null);
      await api.updateMe(n);
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      setError(e);
    }
  };
  return (
    <>
      <Section title="Tài khoản" footer={email}>
        <Field label="Tên bạn" value={name} onChangeText={setName} onBlur={save} onSubmitEditing={save} placeholder="Hiện trong lịch sử đơn" returnKeyType="done" />
      </Section>
      {error ? <ErrorNote error={error} /> : null}
    </>
  );
}
