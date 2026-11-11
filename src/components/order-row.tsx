import { router } from 'expo-router';
import { View } from 'react-native';

import type { Order } from '@shared/domain';
import { orderRemaining } from '@shared/domain';
import { isLate, itemsSummary, orderTitle, relativeDate, statusLabel, timeWindow, vnd } from '@/lib/format';
import { Pill, Row, T } from './ui';

/** One order in any list: who, when + what, status, and the money still owed. */
export function OrderRow({ order, showDate, now }: { order: Order; showDate?: boolean; now: Date }) {
  const late = isLate(order, now);
  const remaining = orderRemaining(order);
  const when = [showDate ? relativeDate(order.dueDate) : null, timeWindow(order) ?? (showDate ? null : 'Chưa hẹn giờ')]
    .filter(Boolean)
    .join(' · ');
  const subtitle = [when, itemsSummary(order)].filter(Boolean).join(' · ');
  const label = statusLabel(order.status, order.fulfillment);

  return (
    <Row
      onPress={() => router.push(`/order/${order.id}`)}
      accessibilityLabel={`Đơn ${order.number}, ${orderTitle(order)}, ${subtitle}, ${late ? 'trễ, ' : ''}${label}${
        remaining > 0 ? `, còn thu ${vnd(remaining)}` : ''
      }`}
      title={
        <T variant="headline" numberOfLines={1}>
          {orderTitle(order)}
        </T>
      }
      subtitle={
        <T variant="subhead" tone="secondary" numberOfLines={1}>
          {subtitle}
        </T>
      }
      detail={
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Pill status={late ? 'late' : order.status} label={late ? 'Trễ' : label} />
          {order.status === 'cancelled' ? null : remaining > 0 ? (
            <T variant="footnote" money numberOfLines={1}>
              {`Còn ${vnd(remaining)}`}
            </T>
          ) : (
            <T variant="footnote" tone="success" numberOfLines={1}>
              Đã thu đủ
            </T>
          )}
        </View>
      }
    />
  );
}
