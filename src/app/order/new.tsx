import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { draftProblem, draftToInput, emptyDraft, OrderForm, type OrderDraft } from '@/components/order-form';
import { Button, Loading, Screen } from '@/components/ui';
import { useCreateOrder, useCustomer } from '@/lib/queries';

export default function NewOrder() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const customer = useCustomer(customerId);

  // "Tạo đơn cho khách này": wait for the customer, then start the form prefilled.
  if (customerId && customer.isPending) return <Loading />;
  const cu = customer.data;
  const initial: OrderDraft = cu
    ? { ...emptyDraft(), customerId: cu.id, customerName: cu.name, customerPhone: cu.phone ?? '', channel: cu.channel ?? 'zalo' }
    : emptyDraft();
  return <NewOrderForm initial={initial} />;
}

function NewOrderForm({ initial }: { initial: OrderDraft }) {
  const [draft, setDraft] = useState(initial);
  const create = useCreateOrder();

  const save = () => {
    if (draftProblem(draft)) return;
    create.mutate(draftToInput(draft), {
      onSuccess: (order) => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/order/${order.id}`);
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <Button title="Huỷ" variant="plain" small onPress={() => router.back()} />,
          headerRight: () => (
            <Button title="Lưu" variant="plain" small onPress={save} loading={create.isPending} disabled={Boolean(draftProblem(draft))} />
          ),
        }}
      />
      <Screen>
        <OrderForm draft={draft} onChange={setDraft} mode="create" error={create.error} saving={create.isPending} onSave={save} />
      </Screen>
    </>
  );
}
