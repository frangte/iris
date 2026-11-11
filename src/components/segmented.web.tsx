import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Type, useColors } from '@/lib/theme';

type Props = { values: string[]; selectedIndex: number; onChange: (index: number) => void; accessibilityLabel?: string };

/**
 * Web build: Expo UI's web segmented control renders unselected labels
 * nearly invisible, so this draws the iOS look with readable states.
 */
export function Segmented({ values, selectedIndex, onChange, accessibilityLabel }: Props) {
  const c = useColors();
  return (
    <View role="tablist" aria-label={accessibilityLabel} style={[styles.track, { backgroundColor: c.fill }]}>
      {values.map((v, i) => {
        const selected = i === selectedIndex;
        return (
          <Pressable
            key={v}
            role="tab"
            aria-selected={selected}
            onPress={() => !selected && onChange(i)}
            style={({ hovered }: { hovered?: boolean; pressed: boolean }) => [
              styles.segment,
              selected && [styles.selected, { backgroundColor: c.cell }],
              !selected && hovered && { opacity: 0.75 },
            ]}>
            <Text
              numberOfLines={1}
              style={[Type.footnote, { color: selected ? c.label : c.secondaryLabel, fontWeight: selected ? '600' : '500' }]}>
              {v}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: Radius.control - 1, padding: 2, minHeight: 32 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.control - 3, paddingHorizontal: 8, minHeight: 28 },
  selected: { boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)' },
});
