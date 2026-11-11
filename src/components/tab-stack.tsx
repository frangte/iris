import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { useColors } from '@/lib/theme';
import { Icon } from './icon';

/** The stack inside each tab: large titles on the root screen, grouped background. */
export function TabStack() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerTintColor: c.tintHex,
        headerTitleStyle: { color: c.labelHex },
        headerLargeTitleStyle: { color: c.labelHex },
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: c.groupedBackground as string },
        headerLargeStyle: { backgroundColor: c.groupedBackground as string },
        contentStyle: { backgroundColor: c.groupedBackground as string },
      }}
    />
  );
}

export function NewOrderButton({ customerId }: { customerId?: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.push(customerId ? `/order/new?customerId=${customerId}` : '/order/new')}
      accessibilityRole="button"
      accessibilityLabel="Tạo đơn mới"
      hitSlop={10}
      style={({ pressed }) => [{ padding: 6 }, pressed && { opacity: 0.5 }]}>
      <Icon name="plus" size={22} color={c.tint} />
    </Pressable>
  );
}
