import { router } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorNote, Field, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Space } from '@/lib/theme';

/** First run: open a new shop, or join one with an invite code. */
export default function Onboarding() {
  const { refreshMe, selectShop, signOut, me, pendingInvite } = useSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState(pendingInvite ?? '');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<unknown>(null);

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      const shop = await api.createShop({ name: name.trim(), phone: phone || null, address: address || null });
      selectShop(shop.id);
      await refreshMe();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length >= 4) router.push(`/join/${c}`);
  };

  return (
    <Screen>
      <T variant="subhead" tone="secondary" style={{ marginTop: Space.sm, paddingHorizontal: Space.xs }}>
        {`Đăng nhập với ${me?.user.email ?? ''}`}
      </T>

      <Section title="Mở shop mới" footer="Bạn là chủ shop. Mời quản lý vào sau, ở mục Shop.">
        <Field label="Tên shop" value={name} onChangeText={setName} placeholder="Tiệm hoa Mộc" returnKeyType="next" />
        <Field label="Điện thoại" value={phone} onChangeText={setPhone} placeholder="Không bắt buộc" keyboardType="phone-pad" inputMode="tel" />
        <Field label="Địa chỉ" value={address} onChangeText={setAddress} placeholder="Nơi shipper tới lấy hàng" />
      </Section>
      <Button title="Tạo shop" onPress={create} loading={busy === 'create'} disabled={!name.trim()} style={{ marginTop: Space.lg }} />

      <Section title="Hoặc vào shop có sẵn" footer="Chủ shop lấy mã ở Shop → Thành viên → Tạo mã mời.">
        <Field
          label="Mã mời"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="VD: K7M2QX"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          returnKeyType="go"
          onSubmitEditing={join}
        />
      </Section>
      <Button title="Vào shop" variant="tinted" onPress={join} disabled={code.trim().length < 4} style={{ marginTop: Space.lg }} />

      {error ? <ErrorNote error={error} /> : null}
      <Button title="Đăng xuất" variant="plain" onPress={signOut} style={{ marginTop: Space.xl }} />
    </Screen>
  );
}
