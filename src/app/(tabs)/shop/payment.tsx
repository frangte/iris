import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Shop } from '@shared/domain';
import { Button, ErrorNote, Field, Loading, Row, Screen, Section, T } from '@/components/ui';
import { useShopDetail, useUpdateShop } from '@/lib/queries';
import { Space } from '@/lib/theme';
import { BANKS, vietQrImageUrl } from '@/lib/vietqr';

/** Bank account used to render VietQR codes on orders. */
export default function Payment() {
  const detail = useShopDetail();
  if (!detail.data) return <Loading />;
  return <PaymentForm key={detail.data.id} saved={detail.data} />;
}

function PaymentForm({ saved }: { saved: Shop }) {
  const update = useUpdateShop();
  const [bin, setBin] = useState<string | null>(saved.bankBin);
  const [accountNo, setAccountNo] = useState(saved.bankAccountNo ?? '');
  const [accountName, setAccountName] = useState(saved.bankAccountName ?? '');
  const [filter, setFilter] = useState('');
  const [picking, setPicking] = useState(false);

  const banks = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? BANKS.filter((b) => `${b.short} ${b.name}`.toLowerCase().includes(f)) : BANKS;
  }, [filter]);

  const bank = BANKS.find((b) => b.bin === bin);
  const ready = Boolean(bin && accountNo.trim());

  return (
    <>
      <Stack.Screen options={{ title: 'Chuyển khoản', headerLargeTitleEnabled: false }} />
      <Screen>
        <Section title="Ngân hàng nhận tiền" footer="Mã QR trên mỗi đơn điền sẵn số tiền còn lại và nội dung DH + số đơn.">
          <Row title="Ngân hàng" detail={bank ? bank.short : 'Chọn'} chevron onPress={() => setPicking(!picking)} />
          {picking ? <Field value={filter} onChangeText={setFilter} placeholder="Tìm ngân hàng" autoCorrect={false} /> : null}
          {picking
            ? banks.map((b) => (
                <Row
                  key={b.bin}
                  title={b.short}
                  subtitle={b.name}
                  detail={b.bin === bin ? <T tone="tint" variant="subhead">Đã chọn</T> : undefined}
                  onPress={() => {
                    setBin(b.bin);
                    setPicking(false);
                    setFilter('');
                  }}
                />
              ))
            : null}
          <Field
            label="Số tài khoản"
            value={accountNo}
            onChangeText={(t) => setAccountNo(t.replace(/\s/g, ''))}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="0123456789"
          />
          <Field
            label="Chủ tài khoản"
            value={accountName}
            onChangeText={(t) => setAccountName(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="NGUYEN THI MOC"
          />
        </Section>

        {ready ? (
          <Section title="Xem trước">
            <View style={styles.qrWrap}>
              <Image
                source={vietQrImageUrl({ bin: bin!, accountNo: accountNo.trim(), accountName: accountName.trim() || null, info: 'DH1' })}
                style={styles.qr}
                contentFit="contain"
                accessibilityLabel="Mã VietQR xem trước"
              />
            </View>
          </Section>
        ) : null}

        {update.error ? <ErrorNote error={update.error} /> : null}
        <Button
          title="Lưu"
          disabled={!ready}
          loading={update.isPending}
          style={{ marginTop: Space.lg }}
          onPress={() =>
            update.mutate(
              { bankBin: bin, bankAccountNo: accountNo.trim(), bankAccountName: accountName.trim() || null },
              { onSuccess: () => router.back() },
            )
          }
        />
        {saved.bankBin ? (
          <Button
            title="Gỡ tài khoản"
            variant="plain"
            style={{ marginTop: Space.sm }}
            onPress={() => update.mutate({ bankBin: null, bankAccountNo: null, bankAccountName: null }, { onSuccess: () => router.back() })}
          />
        ) : null}
        <T variant="footnote" tone="secondary" style={{ marginTop: Space.lg, paddingHorizontal: Space.lg }}>
          Ảnh QR do VietQR.io tạo theo chuẩn NAPAS. Quét thử và kiểm tra tên chủ tài khoản trước khi gửi khách.
        </T>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  qrWrap: { alignItems: 'center', padding: Space.lg, backgroundColor: '#FFFFFF' },
  qr: { width: 240, height: 280 },
});
