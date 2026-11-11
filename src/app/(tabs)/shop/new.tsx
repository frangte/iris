import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorNote, Field, Screen, Section } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Space } from '@/lib/theme';

/** A second (or third) shop under the same account. */
export default function NewShop() {
  const { selectShop, refreshMe } = useSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const shop = await api.createShop({ name: name.trim(), phone: phone || null, address: address || null });
      await refreshMe();
      selectShop(shop.id);
      router.dismissTo('/');
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Mở thêm shop', headerLargeTitleEnabled: false }} />
      <Screen>
        <Section footer="Mỗi shop có sổ đơn, khách và thành viên riêng.">
          <Field label="Tên shop" value={name} onChangeText={setName} placeholder="Tiệm hoa Mộc 2" autoFocus />
          <Field label="Điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" inputMode="tel" placeholder="Không bắt buộc" />
          <Field label="Địa chỉ" value={address} onChangeText={setAddress} placeholder="Nơi shipper tới lấy hàng" />
        </Section>
        {error ? <ErrorNote error={error} /> : null}
        <Button title="Tạo shop" onPress={create} loading={busy} disabled={!name.trim()} style={{ marginTop: Space.lg }} />
      </Screen>
    </>
  );
}
