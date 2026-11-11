import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { OrderDetail } from '@shared/domain';
import { draftFromOrder, draftProblem, draftToInput, OrderForm } from '@/components/order-form';
import { Button, ErrorNote, Loading, Screen } from '@/components/ui';
import { useOrder, useUpdateOrder } from '@/lib/queries';

export default function EditOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrder(id);
  if (order.error) {
    return (
      <Screen>
        <ErrorNote error={order.error} onRetry={order.refetch} />
      </Screen>
    );
  }
  if (!order.data) return <Loading />;
  // Keyed by id: the form snapshots the order once, so realtime refreshes never overwrite typing.
  return <EditForm key={order.data.id} order={order.data} />;
}

function EditForm({ order }: { order: OrderDetail }) {
  const [draft, setDraft] = useState(() => draftFromOrder(order));
  const update = useUpdateOrder();

  const save = () => {
    if (draftProblem(draft)) return;
    const { deposit: _ignored, ...input } = draftToInput(draft);
    update.mutate({ orderId: order.id, input }, { onSuccess: () => router.back() });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `Sửa đơn #${order.number}`,
          headerLeft: () => <Button title="Huỷ" variant="plain" small onPress={() => router.back()} />,
          headerRight: () => (
            <Button title="Lưu" variant="plain" small onPress={save} loading={update.isPending} disabled={Boolean(draftProblem(draft))} />
          ),
        }}
      />
      <Screen>
        <OrderForm draft={draft} onChange={setDraft} mode="edit" paid={order.paid} error={update.error} saving={update.isPending} onSave={save} />
      </Screen>
    </>
  );
}
