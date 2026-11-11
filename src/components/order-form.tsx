import { useDeferredValue, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CHANNELS, type Channel, type Fulfillment, type Order, type OrderInput } from '@shared/domain';
import { addDaysIso, CHANNEL_LABEL, formatPhone, todayIso, vnd } from '@/lib/format';
import { useCustomers } from '@/lib/queries';
import { Space, Type, useColors } from '@/lib/theme';
import { DateInput, TimeInput } from './date-field';
import { Icon } from './icon';
import { Segmented } from './segmented';
import { MoneyField, Stepper } from './inputs';
import { Button, Chip, ErrorNote, Field, Row, Section, T } from './ui';

export type ItemDraft = { key: string; name: string; quantity: number; unitPrice: number; note: string };

export type OrderDraft = {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  channel: Channel | null;
  fulfillment: Fulfillment;
  differentRecipient: boolean;
  recipientName: string;
  recipientPhone: string;
  address: string;
  dueDate: string;
  timeFrom: string | null;
  timeTo: string | null;
  cardMessage: string;
  note: string;
  shippingFee: number;
  discount: number;
  deposit: number;
  items: ItemDraft[];
};

let keySeq = 0;
const newItem = (): ItemDraft => ({ key: `i${++keySeq}`, name: '', quantity: 1, unitPrice: 0, note: '' });

export function emptyDraft(): OrderDraft {
  return {
    customerId: null,
    customerName: '',
    customerPhone: '',
    channel: 'zalo',
    fulfillment: 'delivery',
    differentRecipient: false,
    recipientName: '',
    recipientPhone: '',
    address: '',
    dueDate: todayIso(),
    timeFrom: null,
    timeTo: null,
    cardMessage: '',
    note: '',
    shippingFee: 0,
    discount: 0,
    deposit: 0,
    items: [newItem()],
  };
}

export function draftFromOrder(o: Order): OrderDraft {
  return {
    customerId: o.customerId,
    customerName: o.customerName ?? '',
    customerPhone: o.customerPhone ?? '',
    channel: o.channel,
    fulfillment: o.fulfillment,
    differentRecipient: Boolean(o.recipientName || o.recipientPhone),
    recipientName: o.recipientName ?? '',
    recipientPhone: o.recipientPhone ?? '',
    address: o.address ?? '',
    dueDate: o.dueDate,
    timeFrom: o.timeFrom,
    timeTo: o.timeTo,
    cardMessage: o.cardMessage ?? '',
    note: o.note ?? '',
    shippingFee: o.shippingFee,
    discount: o.discount,
    deposit: 0,
    items: o.items.map((it) => ({ key: `i${++keySeq}`, name: it.name, quantity: it.quantity, unitPrice: it.unitPrice, note: it.note ?? '' })),
  };
}

export function draftTotals(d: OrderDraft) {
  const itemsTotal = d.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const shipping = d.fulfillment === 'delivery' ? d.shippingFee : 0;
  const total = Math.max(0, itemsTotal + shipping - d.discount);
  return { itemsTotal, total };
}

export function draftToInput(d: OrderDraft): OrderInput & { deposit: number } {
  const delivery = d.fulfillment === 'delivery';
  return {
    customerId: d.customerId,
    customerName: d.customerName.trim() || null,
    customerPhone: d.customerPhone.trim() || null,
    channel: d.channel,
    fulfillment: d.fulfillment,
    recipientName: d.differentRecipient ? d.recipientName.trim() || null : null,
    recipientPhone: d.differentRecipient ? d.recipientPhone.trim() || null : null,
    address: delivery ? d.address.trim() || null : null,
    dueDate: d.dueDate,
    timeFrom: d.timeFrom,
    timeTo: d.timeTo,
    cardMessage: d.cardMessage.trim() || null,
    note: d.note.trim() || null,
    shippingFee: delivery ? d.shippingFee : 0,
    discount: d.discount,
    deposit: d.deposit,
    items: d.items
      .filter((it) => it.name.trim())
      .map((it) => ({ name: it.name.trim(), quantity: it.quantity, unitPrice: it.unitPrice, note: it.note.trim() || null })),
  };
}

/** Problems that block saving, in the order the form reads. */
export function draftProblem(d: OrderDraft): string | null {
  if (!d.items.some((it) => it.name.trim())) return 'Thêm ít nhất một sản phẩm';
  if (d.timeFrom && d.timeTo && d.timeFrom > d.timeTo) return 'Giờ kết thúc phải sau giờ bắt đầu';
  if (d.deposit > draftTotals(d).total) return 'Tiền cọc lớn hơn tổng đơn';
  return null;
}

const SLOTS: [string, string][] = [
  ['08:00', '10:00'],
  ['10:00', '12:00'],
  ['12:00', '14:00'],
  ['14:00', '16:00'],
  ['16:00', '18:00'],
  ['18:00', '20:00'],
];

type Props = {
  draft: OrderDraft;
  onChange: (d: OrderDraft) => void;
  mode: 'create' | 'edit';
  paid?: number;
  error?: unknown;
  saving: boolean;
  onSave: () => void;
};

export function OrderForm({ draft: d, onChange, mode, paid = 0, error, saving, onSave }: Props) {
  const c = useColors();
  const set = <K extends keyof OrderDraft>(k: K, v: OrderDraft[K]) => onChange({ ...d, [k]: v });
  const setItem = (key: string, patch: Partial<ItemDraft>) =>
    onChange({ ...d, items: d.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) });
  const today = todayIso();
  const { total } = draftTotals(d);
  const problem = draftProblem(d);
  const remaining = Math.max(0, total - paid - (mode === 'create' ? d.deposit : 0));

  // Suggest saved customers while typing a name or phone, until one is picked.
  const lookup = useDeferredValue(d.customerId ? '' : (d.customerPhone.length >= 3 ? d.customerPhone : d.customerName).trim());
  const suggestions = useCustomers(lookup, lookup.length >= 2);
  const matches = useMemo(
    () => (lookup.length >= 2 ? (suggestions.data ?? []).slice(0, 3) : []),
    [lookup, suggestions.data],
  );

  const timeLabel = d.timeFrom || d.timeTo ? null : 'Không hẹn giờ';

  return (
    <>
      <Section title="Khách đặt">
        <Field
          label="Tên"
          value={d.customerName}
          onChangeText={(v) => onChange({ ...d, customerName: v, customerId: null })}
          placeholder="Chị Thảo"
          textContentType="name"
          returnKeyType="next"
        />
        <Field
          label="Điện thoại"
          value={d.customerPhone}
          onChangeText={(v) => onChange({ ...d, customerPhone: v, customerId: null })}
          placeholder="0909 123 456"
          keyboardType="phone-pad"
          inputMode="tel"
          textContentType="telephoneNumber"
        />
        {matches.map((m) => (
          <Row
            key={m.id}
            icon="person"
            title={m.name}
            subtitle={[m.phone ? formatPhone(m.phone) : null, `${m.orderCount} đơn`].filter(Boolean).join(' · ')}
            detail={<T tone="tint" variant="subhead">Chọn</T>}
            onPress={() =>
              onChange({
                ...d,
                customerId: m.id,
                customerName: m.name,
                customerPhone: m.phone ?? '',
                channel: m.channel ?? d.channel,
              })
            }
          />
        ))}
        {d.customerId ? <Row icon="check" iconColor={c.success} title="Khách quen" subtitle="Đơn sẽ gắn vào lịch sử của khách này" /> : null}
      </Section>
      <View style={styles.chips}>
        {CHANNELS.map((ch) => (
          <Chip key={ch} label={CHANNEL_LABEL[ch]} selected={d.channel === ch} onPress={() => set('channel', d.channel === ch ? null : ch)} />
        ))}
      </View>

      <Section title="Sản phẩm">
        {d.items.flatMap((it, i) => [
          <View key={`${it.key}-name`} style={styles.itemHead}>
            <View style={{ flex: 1 }}>
              <Field
                value={it.name}
                onChangeText={(v) => setItem(it.key, { name: v })}
                placeholder={i === 0 ? 'Bó hồng đỏ 20 cành' : 'Tên sản phẩm'}
                accessibilityLabel={`Tên sản phẩm ${i + 1}`}
              />
            </View>
            {d.items.length > 1 ? (
              <Pressable
                onPress={() => onChange({ ...d, items: d.items.filter((x) => x.key !== it.key) })}
                accessibilityRole="button"
                accessibilityLabel={`Xoá sản phẩm ${i + 1}`}
                hitSlop={8}
                style={styles.removeItem}>
                <Icon name="close" size={20} color={c.tertiaryLabel} />
              </Pressable>
            ) : null}
          </View>,
          <View key={`${it.key}-qty`} style={styles.itemRow}>
            <T tone="secondary">Số lượng</T>
            <Stepper value={it.quantity} onChange={(v) => setItem(it.key, { quantity: v })} />
          </View>,
          <MoneyField key={`${it.key}-price`} label="Đơn giá" value={it.unitPrice} onChange={(v) => setItem(it.key, { unitPrice: v })} />,
        ])}
        <Row icon="plus" title={<T tone="tint">Thêm sản phẩm</T>} onPress={() => set('items', [...d.items, newItem()])} />
      </Section>

      <Section title="Giao nhận" bare>
        <Segmented
          values={['Giao tận nơi', 'Khách tới lấy']}
          selectedIndex={d.fulfillment === 'delivery' ? 0 : 1}
          onChange={(i) => set('fulfillment', i === 0 ? 'delivery' : 'pickup')}
          accessibilityLabel="Cách giao nhận"
        />
      </Section>
      <Section>
        <View style={styles.itemRow}>
          <T>Ngày</T>
          <View style={styles.inline}>
            <Chip label="Hôm nay" selected={d.dueDate === today} onPress={() => set('dueDate', today)} />
            <Chip label="Mai" selected={d.dueDate === addDaysIso(today, 1)} onPress={() => set('dueDate', addDaysIso(today, 1))} />
            <DateInput value={d.dueDate} onChange={(v) => set('dueDate', v)} accessibilityLabel="Ngày giao" />
          </View>
        </View>
        <View style={styles.slotBlock}>
          <T>Khung giờ</T>
          <View style={styles.chips}>
            {SLOTS.map(([from, to]) => (
              <Chip
                key={from}
                label={`${from.slice(0, 2)}–${to.slice(0, 2)}h`}
                selected={d.timeFrom === from && d.timeTo === to}
                onPress={() => onChange({ ...d, timeFrom: from, timeTo: to })}
              />
            ))}
            <Chip label="Không hẹn" selected={!d.timeFrom && !d.timeTo} onPress={() => onChange({ ...d, timeFrom: null, timeTo: null })} />
          </View>
        </View>
        <View style={styles.itemRow}>
          <T tone={timeLabel ? 'secondary' : 'primary'}>Từ giờ</T>
          <TimeInput value={d.timeFrom} onChange={(v) => set('timeFrom', v)} accessibilityLabel="Từ giờ" />
        </View>
        <View style={styles.itemRow}>
          <T tone={timeLabel ? 'secondary' : 'primary'}>Đến giờ</T>
          <TimeInput value={d.timeTo} onChange={(v) => set('timeTo', v)} accessibilityLabel="Đến giờ" />
        </View>
      </Section>

      {d.fulfillment === 'delivery' ? (
        <Section title="Giao tới">
          <Field label="Địa chỉ" value={d.address} onChangeText={(v) => set('address', v)} placeholder="Số nhà, đường, phường, quận" multiline />
          <Row
            title={d.differentRecipient ? 'Người nhận khác người đặt' : 'Người nhận là người đặt'}
            detail={<T tone="tint" variant="subhead">{d.differentRecipient ? 'Bỏ' : 'Đổi'}</T>}
            onPress={() => set('differentRecipient', !d.differentRecipient)}
          />
          {d.differentRecipient ? <Field label="Người nhận" value={d.recipientName} onChangeText={(v) => set('recipientName', v)} placeholder="Tên người nhận" /> : null}
          {d.differentRecipient ? (
            <Field label="SĐT nhận" value={d.recipientPhone} onChangeText={(v) => set('recipientPhone', v)} keyboardType="phone-pad" inputMode="tel" placeholder="Shipper gọi số này" />
          ) : null}
        </Section>
      ) : null}

      <Section title="Thiệp & ghi chú">
        <Field label="Lời thiệp" value={d.cardMessage} onChangeText={(v) => set('cardMessage', v)} placeholder="Chúc mừng sinh nhật…" multiline />
        <Field label="Ghi chú" value={d.note} onChangeText={(v) => set('note', v)} placeholder="Tông màu, giấy gói, dặn shipper…" multiline />
      </Section>

      <Section title="Thanh toán">
        {d.fulfillment === 'delivery' ? <MoneyField label="Phí ship" value={d.shippingFee} onChange={(v) => set('shippingFee', v)} /> : null}
        <MoneyField label="Giảm giá" value={d.discount} onChange={(v) => set('discount', v)} />
        {mode === 'create' ? <MoneyField label="Khách cọc" value={d.deposit} onChange={(v) => set('deposit', v)} /> : null}
        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <T tone="secondary">Tổng đơn</T>
            <T variant="headline" money>{vnd(total)}</T>
          </View>
          {paid > 0 || d.deposit > 0 ? (
            <View style={styles.totalLine}>
              <T tone="secondary">{mode === 'create' ? 'Đã cọc' : 'Đã thu'}</T>
              <T money tone="success">{vnd(mode === 'create' ? d.deposit : paid)}</T>
            </View>
          ) : null}
          <View style={styles.totalLine}>
            <T variant="headline">Còn lại</T>
            <T variant="title2" money>{vnd(remaining)}</T>
          </View>
        </View>
      </Section>

      {problem ? (
        <T variant="footnote" tone="secondary" style={styles.problem}>
          {problem}
        </T>
      ) : null}
      {error ? <ErrorNote error={error} /> : null}
      <Button
        title={mode === 'create' ? `Lưu đơn · ${vnd(total)}` : 'Lưu thay đổi'}
        onPress={onSave}
        loading={saving}
        disabled={Boolean(problem)}
        style={{ marginTop: Space.lg }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },
  itemHead: { flexDirection: 'row', alignItems: 'center' },
  removeItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: Space.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: Space.lg, gap: Space.md },
  slotBlock: { paddingHorizontal: Space.lg, paddingVertical: Space.md },
  totals: { paddingHorizontal: Space.lg, paddingVertical: Space.md, gap: Space.sm },
  totalLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  problem: { ...Type.footnote, textAlign: 'center', marginTop: Space.lg },
});
