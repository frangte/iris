import { router, Stack } from 'expo-router';
import { useState } from 'react';

import type { Shop } from '@shared/domain';

import { Button, ErrorNote, Field, Loading, Screen, Section } from '@/components/ui';
import { api } from '@/lib/api';
import { confirm } from '@/lib/dialog';
import { useShopDetail, useUpdateShop } from '@/lib/queries';
import { useSession, useShop } from '@/lib/session';
import { Space } from '@/lib/theme';

export default function ShopInfo() {
  const detail = useShopDetail();
  if (!detail.data) return <Loading />;
  return <ShopInfoForm key={detail.data.id} saved={detail.data} />;
}

function ShopInfoForm({ saved }: { saved: Shop }) {
  const shop = useShop();
  const update = useUpdateShop();
  const { refreshMe } = useSession();
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone ?? '');
  const [address, setAddress] = useState(saved.address ?? '');
  const [deleteError, setDeleteError] = useState<unknown>(null);

  return (
    <>
      <Stack.Screen options={{ title: 'Thông tin shop', headerLargeTitleEnabled: false }} />
      <Screen>
        <Section footer="Địa chỉ và số điện thoại được chép vào thông tin lấy hàng khi gọi xe giao.">
          <Field label="Tên shop" value={name} onChangeText={setName} />
          <Field label="Điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" inputMode="tel" placeholder="Số shipper gọi khi tới lấy" />
          <Field label="Địa chỉ" value={address} onChangeText={setAddress} placeholder="Nơi shipper tới lấy hàng" multiline />
        </Section>
        {update.error ? <ErrorNote error={update.error} /> : null}
        <Button
          title="Lưu"
          disabled={!name.trim()}
          loading={update.isPending}
          style={{ marginTop: Space.lg }}
          onPress={() => update.mutate({ name: name.trim(), phone: phone || null, address: address || null }, { onSuccess: () => router.back() })}
        />

        {shop.role === 'owner' ? (
          <>
            <Button
              title="Xoá shop"
              variant="destructive"
              style={{ marginTop: Space.xxl * 2 }}
              onPress={async () => {
                const ok = await confirm({
                  title: `Xoá ${shop.name}?`,
                  message: 'Mọi đơn, khách và thành viên của shop bị xoá vĩnh viễn, với tất cả mọi người.',
                  confirm: 'Xoá shop',
                  destructive: true,
                });
                if (!ok) return;
                try {
                  await api.deleteShop(shop.id);
                  await refreshMe();
                } catch (e) {
                  setDeleteError(e);
                }
              }}
            />
            {deleteError ? <ErrorNote error={deleteError} /> : null}
          </>
        ) : null}
      </Screen>
    </>
  );
}
