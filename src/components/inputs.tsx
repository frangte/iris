import { Pressable, StyleSheet, View } from 'react-native';

import { formatMoneyInput, parseMoney } from '@/lib/format';
import { Space, Type, useColors } from '@/lib/theme';
import { Icon } from './icon';
import { Field, T } from './ui';

export function MoneyField({
  label,
  value,
  onChange,
  placeholder = '0',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <Field
      label={label}
      value={formatMoneyInput(value)}
      onChangeText={(t) => onChange(parseMoney(t))}
      keyboardType="number-pad"
      inputMode="numeric"
      placeholder={placeholder}
      suffix="đ"
      style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}
      accessibilityLabel={label}
    />
  );
}

/** − n + with 44pt targets. */
export function Stepper({ value, onChange, min = 1, max = 999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const c = useColors();
  const btn = (delta: number, icon: 'minus' | 'plus', label: string) => {
    const disabled = delta < 0 ? value <= min : value >= max;
    return (
      <Pressable
        onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        style={({ pressed }) => [styles.stepBtn, { backgroundColor: c.fill }, pressed && { opacity: 0.6 }, disabled && { opacity: 0.35 }]}>
        <Icon name={icon} size={16} color={c.label} />
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper} accessibilityRole="adjustable" accessibilityValue={{ now: value, min, max }}>
      {btn(-1, 'minus', 'Giảm số lượng')}
      <T style={[Type.headline, styles.stepValue]} money>
        {value}
      </T>
      {btn(1, 'plus', 'Tăng số lượng')}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 28, textAlign: 'center' },
});
