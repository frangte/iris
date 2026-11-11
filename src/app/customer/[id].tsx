import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { CHANNELS, type Channel } from '@shared/domain';
import { OrderRow } from '@/components/order-row';
import { Button, Chip, ErrorNote, Field, Loading, Row, Screen, Section, Tile } from '@/components/ui';
import { zaloUrl } from '@/lib/delivery';
import { CHANNEL_LABEL, formatPhone, relativeDate, vnd } from '@/lib/format';
import { useCustomer, useUpdateCustomer } from '@/lib/queries';
import { Space } from '@/lib/theme';
import { useNow } from '@/lib/use-now';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useCustomer(id);
  const update = useUpdateCustomer();
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState<Channel | null>(null);

  if (customer.isPending) return <Loading />;
  if (customer.error) {
    return (
      <Screen>
        <ErrorNote error={customer.error} onRetry={customer.refetch} />
      </Screen>
    );
  }
  const cu = customer.data!;

  // Editing starts from the latest saved values.
  const startEditing = () => {
    setName(cu.name);
    setPhone(cu.phone ?? '');
    setNote(cu.note ?? '');
    setChannel(cu.channel);
    setEditing(true);
  };

  const save = () =>
    update.mutate(
      { customerId: cu.id, input: { name: name.trim(), phone: phone || null, channel, note: note || null } },
      { onSuccess: () => setEditing(false) },
    );

  return (
    <>
      <Stack.Screen
        options={{
          title: cu.name,
          headerRight: () => (
            <Button
              title={editing ? 'Lưu' : 'Sửa'}
              variant="plain"
              small
              loading={update.isPending}
              disabled={editing && !name.trim()}
              onPress={editing ? save : startEditing}
            />
          ),
        }}
      />
      <Screen refreshing={customer.isRefetching} onRefresh={customer.refetch}>
        <View style={styles.tiles}>
          <Tile label="Số đơn" value={String(cu.orderCount)} />
          <Tile label="Đã mua" value={vnd(cu.totalSpent)} />
          {typeof cu.owed === 'number' && cu.owed > 0 ? <Tile label="Còn nợ" value={vnd(cu.owed)} tone="danger" /> : null}
        </View>

        {editing ? (
          <>
            <Section title="Thông tin">
              <Field label="Tên" value={name} onChangeText={setName} />
              <Field label="Điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" inputMode="tel" />
              <Field label="Ghi chú" value={note} onChangeText={setNote} placeholder="Thích hoa gì, dịp gì…" multiline />
            </Section>
            <Section title="Kênh liên hệ" bare>
              <View style={styles.chips}>
                {CHANNELS.map((ch) => (
                  <Chip key={ch} label={CHANNEL_LABEL[ch]} selected={channel === ch} onPress={() => setChannel(channel === ch ? null : ch)} />
                ))}
              </View>
            </Section>
            {update.error ? <ErrorNote error={update.error} /> : null}
            <Button title="Huỷ sửa" variant="plain" onPress={() => setEditing(false)} style={{ marginTop: Space.md }} />
          </>
        ) : (
          <Section title="Liên hệ">
            {cu.phone ? <Row title={formatPhone(cu.phone)} subtitle="Gọi điện" icon="phone" onPress={() => Linking.openURL(`tel:${cu.phone}`)} /> : null}
            {cu.phone ? <Row title="Nhắn Zalo" icon="message" onPress={() => Linking.openURL(zaloUrl(cu.phone!))} /> : null}
            {cu.channel ? <Row title="Kênh" detail={CHANNEL_LABEL[cu.channel]} /> : null}
            {cu.note ? <Row title={cu.note} subtitle="Ghi chú" /> : null}
            {!cu.phone && !cu.note && !cu.channel ? <Row title="Chưa có số điện thoại" subtitle="Bấm Sửa để thêm" /> : null}
          </Section>
        )}

        <Button
          title="Tạo đơn cho khách này"
          icon="plus"
          variant="tinted"
          onPress={() => router.push(`/order/new?customerId=${cu.id}`)}
          style={{ marginTop: Space.xl }}
        />

        {cu.orders.length > 0 ? (
          <Section title={cu.lastOrderAt ? `Lịch sử đơn · gần nhất ${relativeDate(cu.lastOrderAt).toLocaleLowerCase('vi')}` : 'Lịch sử đơn'}>
            {cu.orders.map((o) => (
              <OrderRow key={o.id} order={o} now={now} showDate />
            ))}
          </Section>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Space.sm + 2, marginTop: Space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
});
