import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { fromIsoDate, toIsoDate } from '@/lib/format';
import { useColors } from '@/lib/theme';

type DateProps = { value: string; onChange: (iso: string) => void; accessibilityLabel?: string };

/** Native compact date picker (SwiftUI on iOS, Compose on Android). */
export function DateInput({ value, onChange }: DateProps) {
  const c = useColors();
  return (
    <DateTimePicker
      value={fromIsoDate(value)}
      mode="date"
      display="compact"
      locale="vi-VN"
      accentColor={c.tintHex}
      onChange={(_, date) => date && onChange(toIsoDate(date))}
    />
  );
}

type TimeProps = { value: string | null; onChange: (hhmm: string) => void; accessibilityLabel?: string };

export function TimeInput({ value, onChange }: TimeProps) {
  const c = useColors();
  const base = new Date();
  const [h, m] = (value ?? '09:00').split(':').map(Number);
  base.setHours(h, m, 0, 0);
  return (
    <DateTimePicker
      value={base}
      mode="time"
      display="compact"
      is24Hour
      locale="vi-VN"
      accentColor={c.tintHex}
      onChange={(_, date) =>
        date && onChange(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`)
      }
    />
  );
}
