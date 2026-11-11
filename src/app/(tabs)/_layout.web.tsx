import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useShop } from '@/lib/session';
import { Radius, Space, Type, useColors } from '@/lib/theme';

/**
 * Web replaces the native tab bar: a bottom bar at phone widths, a left
 * navigation column on wider screens. Same four sections as iOS and Android.
 */
const TABS: { name: string; href: '/' | '/orders' | '/customers' | '/shop'; label: string; icon: IconName }[] = [
  { name: '(today)', href: '/', label: 'Hôm nay', icon: 'clock' },
  { name: 'orders', href: '/orders', label: 'Đơn', icon: 'ticket' },
  { name: 'customers', href: '/customers', label: 'Khách', icon: 'people' },
  { name: 'shop', href: '/shop', label: 'Shop', icon: 'storefront' },
];

export default function WebTabs() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const c = useColors();
  const shop = useShop();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={[styles.root, { flexDirection: wide ? 'row' : 'column', backgroundColor: c.groupedBackground as string }]}>
      {wide ? (
        <View style={[styles.rail, { borderRightColor: c.separator as string }]}>
          <Text style={[Type.title3, { color: c.label as string }]}>Floied</Text>
          <Text style={[Type.subhead, { color: c.secondaryLabel as string, marginBottom: Space.lg }]} numberOfLines={1}>
            {shop.name}
          </Text>
        </View>
      ) : null}
      <TabSlot style={{ flex: 1, marginLeft: wide ? 240 : 0 }} />
      <TabList
        style={
          wide
            ? styles.railList
            : [styles.bar, { paddingBottom: Math.max(insets.bottom, Space.sm), backgroundColor: c.cell as string, borderTopColor: c.separator as string }]
        }>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} icon={t.icon} wide={wide} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { label: string; icon: IconName; wide: boolean };

const TabButton = forwardRef<ComponentRef<typeof Pressable>, TabButtonProps>(function TabButton({ label, icon, wide, isFocused, ...rest }, ref) {
  const c = useColors();
  const color = isFocused ? c.tint : c.secondaryLabel;
  return (
    <Pressable
      ref={ref}
      {...rest}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
        wide ? styles.railItem : styles.barItem,
        wide && isFocused && { backgroundColor: c.tintSoft },
        wide && hovered && !isFocused && { backgroundColor: c.fill },
        pressed && { opacity: 0.7 },
      ]}>
      <Icon name={icon} size={wide ? 20 : 22} color={color} />
      <Text style={[wide ? Type.body : Type.caption, { color, fontWeight: isFocused ? '600' : '400' }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  rail: { position: 'absolute', top: 0, left: 0, width: 240, paddingHorizontal: Space.xl, paddingTop: Space.xl, borderRightWidth: StyleSheet.hairlineWidth, height: '100%' },
  railList: { position: 'absolute', top: 96, left: Space.md, width: 216, flexDirection: 'column', gap: 2 },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: Space.md, minHeight: 44, paddingHorizontal: Space.md, borderRadius: Radius.control },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Space.xs },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48 },
});
