import { useColors } from '@/lib/theme';

// Expo UI's DateTimePicker renders nothing on web, so the browser's own inputs stand in.

type DateProps = { value: string; onChange: (iso: string) => void; accessibilityLabel?: string };

export function DateInput({ value, onChange, accessibilityLabel }: DateProps) {
  const c = useColors();
  return (
    <input
      type="date"
      aria-label={accessibilityLabel ?? 'Ngày'}
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      style={{ ...inputStyle, color: c.label as string, accentColor: c.tintHex }}
    />
  );
}

type TimeProps = { value: string | null; onChange: (hhmm: string) => void; accessibilityLabel?: string };

export function TimeInput({ value, onChange, accessibilityLabel }: TimeProps) {
  const c = useColors();
  return (
    <input
      type="time"
      aria-label={accessibilityLabel ?? 'Giờ'}
      value={value ?? ''}
      step={300}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      style={{ ...inputStyle, color: c.label as string, accentColor: c.tintHex }}
    />
  );
}

const inputStyle = {
  font: 'inherit',
  fontSize: 17,
  background: 'transparent',
  border: 'none',
  padding: '8px 0',
  minHeight: 44,
  fontVariantNumeric: 'tabular-nums',
} as const;
