import { router, Stack } from 'expo-router';
import { useDeferredValue, useState } from 'react';

import { iosSearchBar, SearchField } from '@/components/search-field';
import { Empty, ErrorNote, Row, Screen, Section, SkeletonRows, T, tabRootHeader, WebTitle } from '@/components/ui';
import { CHANNEL_LABEL, formatPhone, vnd } from '@/lib/format';
import { useCustomers } from '@/lib/queries';

export default function Customers() {
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const customers = useCustomers(q);
  const list = customers.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Khách hàng', ...tabRootHeader, headerSearchBarOptions: iosSearchBar('Tên hoặc số điện thoại', setSearch) }} />
      <Screen refreshing={customers.isRefetching} onRefresh={customers.refetch}>
        <WebTitle title="Khách hàng" />
        <SearchField value={search} onChange={setSearch} placeholder="Tên hoặc số điện thoại" />
        {customers.error ? <ErrorNote error={customers.error} onRetry={customers.refetch} /> : null}
        {customers.isPending ? <SkeletonRows count={6} /> : null}
        {customers.data && list.length === 0 ? (
          <Empty
            title={q ? 'Không tìm thấy khách' : 'Chưa có khách'}
            message={q ? undefined : 'Khách được lưu tự động khi bạn tạo đơn có tên hoặc số điện thoại.'}
          />
        ) : null}
        {list.length > 0 ? (
          <Section title={`${list.length} khách`}>
            {list.map((cu) => (
              <Row
                key={cu.id}
                onPress={() => router.push(`/customer/${cu.id}`)}
                chevron
                title={<T variant="headline" numberOfLines={1}>{cu.name}</T>}
                subtitle={
                  cu.phone || cu.channel ? (
                    <T variant="subhead" tone="secondary" numberOfLines={1}>
                      {[cu.phone ? formatPhone(cu.phone) : null, cu.channel ? CHANNEL_LABEL[cu.channel] : null].filter(Boolean).join(' · ')}
                    </T>
                  ) : undefined
                }
                detail={<CustomerMoney owed={cu.owed} totalSpent={cu.totalSpent} orderCount={cu.orderCount} />}
              />
            ))}
          </Section>
        ) : null}
      </Screen>
    </>
  );
}

/**
 * Debt first, in red. A missing `owed` (older server, bad response) shows a
 * dash rather than falling through to "settled".
 */
function CustomerMoney({ owed, totalSpent, orderCount }: { owed: number | undefined; totalSpent: number; orderCount: number }) {
  if (typeof owed !== 'number') {
    return (
      <>
        <T variant="subhead" tone="secondary">–</T>
        <T variant="footnote" tone="secondary">{`${orderCount} đơn`}</T>
      </>
    );
  }
  return owed > 0 ? (
    <>
      <T variant="subhead" tone="danger" money numberOfLines={1}>{`Còn nợ ${vnd(owed)}`}</T>
      <T variant="footnote" tone="secondary" numberOfLines={1}>{`${orderCount} đơn · đã mua ${vnd(totalSpent)}`}</T>
    </>
  ) : (
    <>
      <T variant="subhead" money numberOfLines={1}>{vnd(totalSpent)}</T>
      <T variant="footnote" tone="secondary" numberOfLines={1}>{`đã mua · ${orderCount} đơn`}</T>
    </>
  );
}
