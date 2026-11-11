import { SegmentedControl } from '@expo/ui/community/segmented-control';

import { useColors } from '@/lib/theme';

type Props = { values: string[]; selectedIndex: number; onChange: (index: number) => void; accessibilityLabel?: string };

/** The platform's own segmented control (UISegmentedControl / Material segmented button). */
export function Segmented({ values, selectedIndex, onChange, accessibilityLabel }: Props) {
  const c = useColors();
  return (
    <SegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      onChange={(e) => onChange(e.nativeEvent.selectedSegmentIndex)}
      tintColor={c.tintHex}
      accessibilityLabel={accessibilityLabel}
      style={{ height: 32 }}
    />
  );
}
