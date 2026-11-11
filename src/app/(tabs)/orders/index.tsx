import { Stack } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Order } from '@shared/domain';
import { OrderRow } from '@/components/order-row';
import { iosSearchBar, SearchField } from '@/components/search-field';
import { Segmented } from '@/components/segmented';
import { NewOrderButton } from '@/components/tab-stack';
import { Empty, ErrorNote, Screen, Section, SkeletonRows, tabRootHeader, WebTitle } from '@/components/ui';
import type { OrderFilters } from '@/lib/api';
import { addDaysIso, relativeDate, todayIso } from '@/lib/format';
import { useOrders } from '@/lib/queries';
import { Space } from '@/lib/theme';
import { useNow } from '@/lib/use-now';

const TABS = ['Đang mở', 'Đã giao', 'Đã huỷ'] as const;

export default function Orders() {
  const now = useNow();
  const today = todayIso(now);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());

  const filters: OrderFilters = useMemo(() => {
    if (q) return { q };
    if (tab === 0) return { open: true };
    const from = addDaysIso(today, -60);
    return { status: [tab === 1 ? 'delivered' : 'cancelled'], from };
  }, [q, tab, today]);
  const orders = useOrders(filters);

  // Open orders read soonest-first; history and search read newest-first.
  const sections = useMemo(() => {
    const list = orders.data ?? [];
    const sorted = tab === 0 && !q ? list : [...list].reverse();
    const map = new Map<string, Order[]>();
    for (const o of sorted) map.set(o.dueDate, [...(map.get(o.dueDate) ?? []), o]);
    return [...map.entries()];
  }, [orders.data, tab, q]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Đơn hàng',
          ...tabRootHeader,
          headerRight: () => <NewOrderButton />,
          headerSearchBarOptions: iosSearchBar('Tên, số điện thoại, #số đơn', setSearch),
        }}
      />
      <Screen refreshing={orders.isRefetching} onRefresh={orders.refetch}>
        <WebTitle title="Đơn hàng" action={<NewOrderButton />} />
        <SearchField value={search} onChange={setSearch} placeholder="Tên, số điện thoại, #số đơn" />
        {!q ? (
          <View style={styles.segments}>
            <Segmented values={[...TABS]} selectedIndex={tab} onChange={setTab} accessibilityLabel="Lọc đơn" />
          </View>
        ) : null}

        {orders.error ? <ErrorNote error={orders.error} onRetry={orders.refetch} /> : null}
        {orders.isPending ? <SkeletonRows count={6} /> : null}

        {orders.data && sections.length === 0 ? (
          <Empty
            title={q ? 'Không tìm thấy đơn' : tab === 0 ? 'Không có đơn đang mở' : 'Chưa có đơn nào'}
            message={q ? `Không có đơn khớp "${q}".` : tab === 0 ? 'Đơn mới tạo sẽ nằm ở đây tới khi giao xong.' : 'Hiện đơn trong 60 ngày gần nhất.'}
          />
        ) : null}

        {sections.map(([date, list]) => (
          <Section key={date} title={relativeDate(date, today)}>
            {list.map((o) => (
              <OrderRow key={o.id} order={o} now={now} />
            ))}
          </Section>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  segments: { marginTop: Space.md },
});
