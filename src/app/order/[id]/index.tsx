import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Linking, Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { STATUS_FLOW, orderRemaining, type OrderDetail, type OrderEvent, type OrderStatus, type Shop } from '@shared/domain';
import { MoneyField } from '@/components/inputs';
import { Button, ErrorNote, Loading, Pill, Row, Screen, Section, T } from '@/components/ui';
import { useToast } from '@/components/toast';
import { confirm } from '@/lib/dialog';
import { COURIERS, deliveryText, handOff, mapsUrl, zaloUrl, type Courier } from '@/lib/delivery';
import {
  CHANNEL_LABEL,
  formatPhone,
  isLate,
  nextStatus,
  orderTitle,
  relativeDate,
  statusLabel,
  timeWindow,
  vnd,
} from '@/lib/format';
import { useAddPayment, useDeleteOrder, useOrder, useSetStatus, useShopDetail } from '@/lib/queries';
import { Radius, Space, useColors } from '@/lib/theme';
import { useNow } from '@/lib/use-now';
import { bankShortName, vietQrImageUrl } from '@/lib/vietqr';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrder(id);
  const shop = useShopDetail();
  const now = useNow();

  if (order.isPending) return <Loading />;
  if (order.error) {
    return (
      <Screen>
        <ErrorNote error={order.error} onRetry={order.refetch} />
      </Screen>
    );
  }
  const o = order.data!;
  return (
    <>
      <Stack.Screen
        options={{
          title: `Đơn #${o.number}`,
          headerRight: () => <Button title="Sửa" variant="plain" small onPress={() => router.push(`/order/${o.id}/edit`)} />,
        }}
      />
      <Screen refreshing={order.isRefetching} onRefresh={order.refetch}>
        <Summary order={o} now={now} />
        <StatusControl order={o} />
        <Money order={o} shop={shop.data} />
        <Delivery order={o} shop={shop.data} />
        <Customer order={o} />
        <Items order={o} />
        {o.cardMessage || o.note ? (
          <Section title="Thiệp & ghi chú">
            {o.cardMessage ? <Row title={o.cardMessage} subtitle="Lời thiệp" /> : null}
            {o.note ? <Row title={o.note} subtitle="Ghi chú" /> : null}
          </Section>
        ) : null}
        <History events={o.events} fulfillment={o.fulfillment} />
        <Danger order={o} />
      </Screen>
    </>
  );
}

function Summary({ order: o, now }: { order: OrderDetail; now: Date }) {
  const late = isLate(o, now);
  const when = [relativeDate(o.dueDate), timeWindow(o) ?? 'chưa hẹn giờ'].join(' · ');
  return (
    <View style={styles.summary}>
      <View style={styles.pills}>
        <Pill status={o.status} label={statusLabel(o.status, o.fulfillment)} />
        {late ? <Pill status="late" label="Trễ hẹn" /> : null}
      </View>
      <T variant="title1" numberOfLines={2}>
        {orderTitle(o)}
      </T>
      <T variant="callout" tone={late ? 'danger' : 'secondary'}>
        {`${when} · ${o.fulfillment === 'pickup' ? 'Khách tới lấy' : 'Giao tận nơi'}`}
      </T>
    </View>
  );
}

/**
 * One button for the usual next step. Jumping to any other step goes through
 * the platform's action sheet on iOS, an inline list elsewhere.
 */
function StatusControl({ order: o }: { order: OrderDetail }) {
  const c = useColors();
  const setStatus = useSetStatus();
  const [listOpen, setListOpen] = useState(false);
  const next = nextStatus(o);
  const go = (status: OrderStatus) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setListOpen(false);
    setStatus.mutate({ orderId: o.id, status });
  };
  const choose = () => {
    if (Platform.OS !== 'ios') {
      setListOpen(!listOpen);
      return;
    }
    const labels = STATUS_FLOW.map((s) => statusLabel(s, o.fulfillment));
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Đổi trạng thái',
        options: [...labels, 'Huỷ'],
        cancelButtonIndex: labels.length,
        disabledButtonIndices: [STATUS_FLOW.indexOf(o.status)],
        tintColor: c.tintHex,
      },
      (i) => {
        if (i < STATUS_FLOW.length) go(STATUS_FLOW[i]);
      },
    );
  };
  if (o.status === 'cancelled') return null;
  return (
    <>
      {next ? (
        <Button title={next.label} onPress={() => go(next.status)} loading={setStatus.isPending} style={{ marginTop: Space.lg }} />
      ) : null}
      <Section>
        <Row title="Đổi trạng thái" detail={statusLabel(o.status, o.fulfillment)} chevron onPress={choose} />
        {listOpen
          ? STATUS_FLOW.map((s) => (
              <Row
                key={s}
                title={statusLabel(s, o.fulfillment)}
                detail={s === o.status ? <T variant="subhead" tone="tint">Hiện tại</T> : undefined}
                onPress={s === o.status ? undefined : () => go(s)}
              />
            ))
          : null}
      </Section>
      {setStatus.error ? <ErrorNote error={setStatus.error} /> : null}
    </>
  );
}

function Money({ order: o, shop }: { order: OrderDetail; shop: Shop | undefined }) {
  const c = useColors();
  const pay = useAddPayment();
  const toast = useToast();
  const remaining = orderRemaining(o);
  const [custom, setCustom] = useState<number | null>(null);
  const [showQr, setShowQr] = useState(false);
  const hasBank = Boolean(shop?.bankBin && shop?.bankAccountNo);
  const collect = (amount: number, note?: string) =>
    pay.mutate(
      { orderId: o.id, amount, note },
      {
        onSuccess: () => {
          setCustom(null);
          toast(`Đã ghi nhận ${vnd(amount)}`);
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    );

  return (
    <Section title="Thanh toán">
      <View style={styles.money}>
        <T variant="subhead" tone="secondary">
          {o.status === 'cancelled' ? 'Đơn đã huỷ · tổng đơn' : remaining > 0 ? 'Còn phải thu' : 'Đã thu đủ'}
        </T>
        <T variant="largeTitle" money tone={o.status === 'cancelled' ? 'secondary' : remaining > 0 ? 'primary' : 'success'}>
          {vnd(o.status === 'cancelled' ? o.total : remaining > 0 ? remaining : o.paid)}
        </T>
        <View style={styles.moneyLines}>
          <MoneyLine label="Tổng đơn" value={vnd(o.total)} />
          <MoneyLine label="Đã thu" value={vnd(o.paid)} />
        </View>
        {remaining > 0 && o.status !== 'cancelled' ? (
          <View style={styles.moneyActions}>
            <Button title={`Thu đủ ${vnd(remaining)}`} onPress={() => collect(remaining, 'Thu đủ')} loading={pay.isPending && custom === null} style={{ flex: 1 }} />
            <Button title="Số khác" variant="tinted" onPress={() => setCustom(custom === null ? 0 : null)} />
          </View>
        ) : null}
      </View>
      {custom !== null ? <MoneyField label="Số tiền thu" value={custom} onChange={setCustom} /> : null}
      {custom !== null ? (
        <View style={styles.inlineAction}>
          <Button title="Ghi nhận" small disabled={custom <= 0 || custom > remaining} loading={pay.isPending} onPress={() => collect(custom)} />
        </View>
      ) : null}
      {pay.error ? (
        <View style={{ padding: Space.md }}>
          <ErrorNote error={pay.error} />
        </View>
      ) : null}
      {remaining > 0 && hasBank ? (
        <Row icon="qr" title={showQr ? 'Ẩn mã QR' : 'Mã QR chuyển khoản'} subtitle={`${bankShortName(shop!.bankBin)} · ${shop!.bankAccountNo}`} onPress={() => setShowQr(!showQr)} />
      ) : null}
      {showQr && hasBank && remaining > 0 ? (
        <View style={styles.qrWrap}>
          <Image
            source={vietQrImageUrl({
              bin: shop!.bankBin!,
              accountNo: shop!.bankAccountNo!,
              accountName: shop!.bankAccountName,
              amount: remaining,
              info: `DH${o.number}`,
            })}
            style={styles.qr}
            contentFit="contain"
            accessibilityLabel={`Mã VietQR chuyển ${vnd(remaining)} cho đơn ${o.number}`}
          />
        </View>
      ) : null}
      {remaining > 0 && !hasBank ? (
        <Row icon="bank" iconColor={c.secondaryLabel} title="Thêm tài khoản ngân hàng" subtitle="Để hiện mã VietQR cho khách quét" chevron onPress={() => router.push('/shop/payment')} />
      ) : null}
      <Row icon="share" title="Gửi hoá đơn cho khách" subtitle="Qua Zalo, Messenger…" onPress={() => shareInvoice(o, shop)} />
    </Section>
  );
}

function MoneyLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.moneyLine}>
      <T variant="subhead" tone="secondary">{label}</T>
      <T variant="subhead" money>{value}</T>
    </View>
  );
}

function shareInvoice(o: OrderDetail, shop: Shop | undefined) {
  const lines = [
    shop ? shop.name : null,
    `Đơn #${o.number} · ${relativeDate(o.dueDate)}${timeWindow(o) ? ` ${timeWindow(o)}` : ''}`,
    '',
    ...o.items.map((it) => `${it.quantity} × ${it.name}: ${vnd(it.quantity * it.unitPrice)}`),
    o.shippingFee ? `Phí ship: ${vnd(o.shippingFee)}` : null,
    o.discount ? `Giảm giá: -${vnd(o.discount)}` : null,
    `Tổng: ${vnd(o.total)}`,
    o.paid ? `Đã thanh toán: ${vnd(o.paid)}` : null,
    orderRemaining(o) ? `Còn lại: ${vnd(orderRemaining(o))}` : 'Đã thanh toán đủ',
    shop?.bankBin && shop.bankAccountNo && orderRemaining(o)
      ? `\nChuyển khoản: ${bankShortName(shop.bankBin)} ${shop.bankAccountNo}${shop.bankAccountName ? ` (${shop.bankAccountName})` : ''}\nNội dung: DH${o.number}`
      : null,
  ].filter((l) => l !== null);
  const message = lines.join('\n');
  if (Platform.OS === 'web' && !navigator.share) {
    Clipboard.setStringAsync(message);
    return;
  }
  Share.share({ message });
}

function Delivery({ order: o, shop }: { order: OrderDetail; shop: Shop | undefined }) {
  const c = useColors();
  const toast = useToast();
  if (o.fulfillment === 'pickup') {
    return (
      <Section title="Giao nhận">
        <Row icon="bag" title="Khách tới lấy tại shop" subtitle={shop?.address ?? undefined} />
      </Section>
    );
  }
  const name = o.recipientName ?? o.customerName;
  const phone = o.recipientPhone ?? o.customerPhone;
  const text = deliveryText(o, shop);
  const send = async (courier: Courier) => {
    const result = await handOff(courier, text);
    toast(
      result === 'opened'
        ? `Đã chép thông tin giao hàng. Dán vào ${courier.name}`
        : result === 'store'
          ? `Chưa cài ${courier.name}. Thông tin đã được chép`
          : 'Đã chép thông tin giao hàng',
    );
  };
  return (
    <Section title="Giao tới" footer={Platform.OS === 'web' ? 'Trên web: thông tin được chép để dán vào app giao hàng.' : 'Bấm một app: thông tin giao hàng được chép sẵn để dán vào.'}>
      <Row title={name ?? 'Chưa có tên người nhận'} subtitle={phone ? formatPhone(phone) : 'Chưa có số điện thoại'} icon="person" iconColor={c.secondaryLabel}
        detail={phone ? <CallButton phone={phone} /> : undefined} />
      {o.address ? (
        <Row title={o.address} icon="map" iconColor={c.secondaryLabel} onPress={() => Linking.openURL(mapsUrl(o.address!))} chevron />
      ) : (
        <Row title="Chưa có địa chỉ" subtitle="Bấm Sửa để thêm" icon="map" iconColor={c.tertiaryLabel} />
      )}
      <View style={styles.couriers}>
        {COURIERS.map((courier) => (
          <Pressable
            key={courier.id}
            onPress={() => send(courier)}
            accessibilityRole="button"
            accessibilityLabel={`Gọi ${courier.name} giao đơn này`}
            style={({ pressed }) => [styles.courier, { backgroundColor: c.fill }, pressed && { opacity: 0.6 }]}>
            <T variant="subhead" style={{ fontWeight: '600' }}>{courier.name}</T>
          </Pressable>
        ))}
      </View>
      <Row
        icon="copy"
        title="Chép thông tin giao hàng"
        onPress={async () => {
          await Clipboard.setStringAsync(text);
          toast('Đã chép thông tin giao hàng');
        }}
      />
    </Section>
  );
}

function CallButton({ phone }: { phone: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => Linking.openURL(`tel:${phone}`)}
      accessibilityRole="button"
      accessibilityLabel={`Gọi ${formatPhone(phone)}`}
      hitSlop={6}
      style={({ pressed }) => [styles.roundBtn, { backgroundColor: c.tintSoft }, pressed && { opacity: 0.6 }]}>
      <T tone="tint" variant="subhead" style={{ fontWeight: '600' }}>Gọi</T>
    </Pressable>
  );
}

function Customer({ order: o }: { order: OrderDetail }) {
  if (!o.customerName && !o.customerPhone) return null;
  return (
    <Section title="Khách đặt">
      <Row
        title={o.customerName ?? formatPhone(o.customerPhone)}
        subtitle={[o.customerPhone ? formatPhone(o.customerPhone) : null, o.channel ? CHANNEL_LABEL[o.channel] : null].filter(Boolean).join(' · ') || undefined}
        chevron={Boolean(o.customerId)}
        onPress={o.customerId ? () => router.push(`/customer/${o.customerId}`) : undefined}
      />
      {o.customerPhone ? <Row icon="message" title="Nhắn Zalo" onPress={() => Linking.openURL(zaloUrl(o.customerPhone!))} /> : null}
    </Section>
  );
}

function Items({ order: o }: { order: OrderDetail }) {
  return (
    <Section title="Sản phẩm">
      {o.items.map((it) => (
        <Row
          key={it.id}
          title={it.quantity > 1 ? `${it.quantity} × ${it.name}` : it.name}
          subtitle={it.note ?? undefined}
          detail={<T money>{vnd(it.quantity * it.unitPrice)}</T>}
        />
      ))}
      {o.shippingFee ? <Row title="Phí ship" detail={<T money tone="secondary">{vnd(o.shippingFee)}</T>} /> : null}
      {o.discount ? <Row title="Giảm giá" detail={<T money tone="secondary">{`−${vnd(o.discount)}`}</T>} /> : null}
      <Row title={<T variant="headline">Tổng</T>} detail={<T variant="headline" money>{vnd(o.total)}</T>} />
    </Section>
  );
}

function eventText(e: OrderEvent, fulfillment: OrderDetail['fulfillment']): string {
  switch (e.type) {
    case 'created':
      return 'Tạo đơn';
    case 'updated':
      return 'Sửa đơn';
    case 'status':
      return e.toStatus ? `Chuyển sang ${statusLabel(e.toStatus, fulfillment).toLocaleLowerCase('vi')}` : 'Đổi trạng thái';
    case 'payment':
      return (e.amount ?? 0) >= 0 ? `Thu ${vnd(e.amount ?? 0)}${e.note ? ` · ${e.note}` : ''}` : `Hoàn ${vnd(-(e.amount ?? 0))}`;
  }
}

function History({ events, fulfillment }: { events: OrderEvent[]; fulfillment: OrderDetail['fulfillment'] }) {
  if (events.length === 0) return null;
  return (
    <Section title="Lịch sử">
      {events.map((e) => {
        const d = new Date(e.createdAt);
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · ${d.getDate()}/${d.getMonth() + 1}`;
        return <Row key={e.id} title={eventText(e, fulfillment)} subtitle={[e.actorName, time].filter(Boolean).join(' · ')} />;
      })}
    </Section>
  );
}

function Danger({ order: o }: { order: OrderDetail }) {
  const setStatus = useSetStatus();
  const del = useDeleteOrder();
  return (
    <View style={styles.danger}>
      {o.status === 'cancelled' ? (
        <Button title="Mở lại đơn" variant="tinted" onPress={() => setStatus.mutate({ orderId: o.id, status: 'new' })} loading={setStatus.isPending} />
      ) : (
        <Button
          title="Huỷ đơn"
          variant="destructive"
          onPress={async () => {
            const ok = await confirm({ title: `Huỷ đơn #${o.number}?`, message: 'Đơn vẫn được lưu và có thể mở lại.', confirm: 'Huỷ đơn', destructive: true });
            if (ok) setStatus.mutate({ orderId: o.id, status: 'cancelled' });
          }}
        />
      )}
      <Button
        title="Xoá vĩnh viễn"
        variant="plain"
        loading={del.isPending}
        onPress={async () => {
          const ok = await confirm({
            title: `Xoá đơn #${o.number}?`,
            message: 'Không khôi phục được. Mọi thành viên sẽ mất đơn này.',
            confirm: 'Xoá',
            destructive: true,
          });
          if (ok) del.mutate(o.id, { onSuccess: () => router.back() });
        }}
      />
      {del.error ? <ErrorNote error={del.error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: Space.md, gap: Space.xs, paddingHorizontal: Space.xs },
  pills: { flexDirection: 'row', gap: Space.sm, marginBottom: Space.xs },
  money: { padding: Space.lg, gap: Space.xs },
  moneyLines: { marginTop: Space.sm, gap: Space.xs },
  moneyLine: { flexDirection: 'row', justifyContent: 'space-between' },
  moneyActions: { flexDirection: 'row', gap: Space.sm, marginTop: Space.md },
  inlineAction: { paddingHorizontal: Space.lg, paddingBottom: Space.md, alignItems: 'flex-end' },
  qrWrap: { alignItems: 'center', padding: Space.lg, backgroundColor: '#FFFFFF' },
  qr: { width: 260, height: 300 },
  couriers: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, padding: Space.lg },
  courier: { minHeight: 44, minWidth: 92, paddingHorizontal: Space.md, borderRadius: Radius.control, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  roundBtn: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  danger: { marginTop: Space.xxl, gap: Space.sm },
});
