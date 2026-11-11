import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Order } from '@shared/domain';
import { CLOSED_STATUSES, orderRemaining } from '@shared/domain';
import { OrderRow } from '@/components/order-row';
import { NewOrderButton } from '@/components/tab-stack';
import { Button, Empty, ErrorNote, Screen, Section, SkeletonRows, T, tabRootHeader, Tile, WebTitle } from '@/components/ui';
import { DAY_PART_LABEL, dayPart, isLate, longDate, relativeDate, todayIso, vnd, type DayPart } from '@/lib/format';
import { useBoard } from '@/lib/queries';
import { useShop } from '@/lib/session';
import { Space } from '@/lib/theme';
import { useNow } from '@/lib/use-now';

const PARTS: DayPart[] = ['morning', 'afternoon', 'evening', 'anytime'];

export default function Today() {
  const shop = useShop();
  const now = useNow();
  const today = todayIso(now);
  const board = useBoard(today);

  const view = useMemo(() => {
    if (!board.data) return null;
    const { overdue, today: dueToday, upcoming } = board.data;
    const open = dueToday.filter((o) => !CLOSED_STATUSES.includes(o.status));
    const late = [...overdue, ...open.filter((o) => isLate(o, now))];
    const lateIds = new Set(late.map((o) => o.id));
    const byPart = new Map<DayPart, Order[]>();
    for (const o of open) {
      if (lateIds.has(o.id)) continue;
      const part = dayPart(o);
      byPart.set(part, [...(byPart.get(part) ?? []), o]);
    }
    const done = dueToday.filter((o) => CLOSED_STATUSES.includes(o.status));
    const owed = [...overdue, ...dueToday].reduce((sum, o) => sum + orderRemaining(o), 0);
    const upcomingByDate = new Map<string, Order[]>();
    for (const o of upcoming) upcomingByDate.set(o.dueDate, [...(upcomingByDate.get(o.dueDate) ?? []), o]);
    return {
      late,
      byPart,
      done,
      upcomingByDate,
      todayCount: dueToday.filter((o) => o.status !== 'cancelled').length,
      owed,
      empty: overdue.length + dueToday.length + upcoming.length === 0,
    };
  }, [board.data, now]);

  return (
    <>
      <Stack.Screen options={{ title: 'Hôm nay', ...tabRootHeader, headerRight: () => <NewOrderButton /> }} />
      <Screen refreshing={board.isRefetching} onRefresh={board.refetch}>
        <WebTitle title="Hôm nay" action={<NewOrderButton />} />
        <T variant="subhead" tone="secondary" style={styles.subtitle}>
          {`${longDate(today)} · ${shop.name}`}
        </T>

        {board.error ? <ErrorNote error={board.error} onRetry={board.refetch} /> : null}

        <View style={styles.tiles}>
          <Tile label="Đơn hôm nay" value={view ? String(view.todayCount) : '–'} />
          <Tile label="Trễ" value={view ? String(view.late.length) : '–'} tone={view?.late.length ? 'danger' : undefined} />
          <Tile label="Còn thu" value={view ? compactVnd(view.owed) : '–'} />
        </View>

        {board.isPending ? <SkeletonRows /> : null}

        {view?.empty ? (
          <Empty
            title="Chưa có đơn nào"
            message="Đơn hôm nay, đơn trễ và đơn 7 ngày tới hiện ở đây."
            action={<Button title="Tạo đơn đầu tiên" icon="plus" onPress={() => router.push('/order/new')} />}
          />
        ) : null}

        {view && view.late.length > 0 ? (
          <Section title="Trễ">
            {view.late.map((o) => (
              <OrderRow key={o.id} order={o} now={now} showDate={o.dueDate !== today} />
            ))}
          </Section>
        ) : null}

        {view
          ? PARTS.map((part) => {
              const list = view.byPart.get(part);
              if (!list?.length) return null;
              return (
                <Section key={part} title={DAY_PART_LABEL[part]}>
                  {list.map((o) => (
                    <OrderRow key={o.id} order={o} now={now} />
                  ))}
                </Section>
              );
            })
          : null}

        {view && view.done.length > 0 ? (
          <Section title={`Xong hôm nay · ${view.done.length}`}>
            {view.done.map((o) => (
              <OrderRow key={o.id} order={o} now={now} />
            ))}
          </Section>
        ) : null}

        {view
          ? [...view.upcomingByDate.entries()].map(([date, list]) => (
              <Section key={date} title={relativeDate(date, today)}>
                {list.map((o) => (
                  <OrderRow key={o.id} order={o} now={now} />
                ))}
              </Section>
            ))
          : null}
      </Screen>
    </>
  );
}

/** Tiles are narrow: 3.450.000đ → 3,45tr; small amounts stay exact. */
function compactVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}tr`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return vnd(n);
}

const styles = StyleSheet.create({
  subtitle: { paddingHorizontal: Space.xs, marginTop: Space.xs },
  tiles: { flexDirection: 'row', gap: Space.sm + 2, marginTop: Space.lg },
});
