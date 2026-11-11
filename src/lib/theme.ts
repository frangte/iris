import { Platform, PlatformColor, useColorScheme, type ColorValue } from 'react-native';

import type { OrderStatus } from '@shared/domain';

/**
 * Semantic colors. iOS reads the system palette (adapts to Dark Mode and
 * Increase Contrast on its own); Android and web use matching hex values.
 * The rose tint is the only brand color and only marks actions and selection.
 */
export type Palette = {
  /** Text and icons. */
  tint: ColorValue;
  tintHex: string;
  /** Filled controls with white labels; one value in both modes so contrast holds (4.8:1). */
  tintFill: ColorValue;
  /** Plain hex label color, for APIs that only take strings (navigation titles). */
  labelHex: string;
  onTint: ColorValue;
  tintSoft: ColorValue;
  groupedBackground: ColorValue;
  cell: ColorValue;
  cellPressed: ColorValue;
  label: ColorValue;
  secondaryLabel: ColorValue;
  tertiaryLabel: ColorValue;
  placeholder: ColorValue;
  separator: ColorValue;
  fill: ColorValue;
  danger: ColorValue;
  dangerSoft: ColorValue;
  success: ColorValue;
};

const TINT = { light: '#D1336B', dark: '#FF6F9F' };

const hex = {
  light: {
    groupedBackground: '#F2F2F7',
    cell: '#FFFFFF',
    cellPressed: '#E5E5EA',
    label: '#1C1C1E',
    secondaryLabel: '#5E5E64',
    tertiaryLabel: '#8A8A8E',
    placeholder: '#8A8A8E',
    separator: '#D8D8DC',
    fill: '#E9E9EE',
    danger: '#C4001A',
    dangerSoft: '#FFE8E8',
    success: '#1E7B34',
    tintSoft: '#FCE8EF',
  },
  dark: {
    groupedBackground: '#000000',
    cell: '#1C1C1E',
    cellPressed: '#2C2C2E',
    label: '#FFFFFF',
    secondaryLabel: '#AEAEB2',
    tertiaryLabel: '#8D8D93',
    placeholder: '#7C7C80',
    separator: '#38383A',
    fill: '#2C2C2E',
    danger: '#FF6961',
    dangerSoft: '#3A1517',
    success: '#4CD964',
    tintSoft: '#3A1624',
  },
};

function iosPalette(scheme: 'light' | 'dark'): Palette {
  const h = hex[scheme];
  return {
    tint: TINT[scheme],
    tintHex: TINT[scheme],
    tintFill: TINT.light,
    labelHex: h.label,
    onTint: '#FFFFFF',
    tintSoft: h.tintSoft,
    groupedBackground: PlatformColor('systemGroupedBackground'),
    cell: PlatformColor('secondarySystemGroupedBackground'),
    cellPressed: PlatformColor('systemGray5'),
    label: PlatformColor('label'),
    secondaryLabel: PlatformColor('secondaryLabel'),
    tertiaryLabel: PlatformColor('tertiaryLabel'),
    placeholder: PlatformColor('placeholderText'),
    separator: PlatformColor('separator'),
    fill: PlatformColor('tertiarySystemFill'),
    danger: PlatformColor('systemRed'),
    dangerSoft: h.dangerSoft,
    success: PlatformColor('systemGreen'),
  };
}

function hexPalette(scheme: 'light' | 'dark'): Palette {
  const h = hex[scheme];
  return { ...h, tint: TINT[scheme], tintHex: TINT[scheme], tintFill: TINT.light, labelHex: h.label, onTint: '#FFFFFF' };
}

export function useColors(): Palette {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return Platform.OS === 'ios' ? iosPalette(scheme) : hexPalette(scheme);
}

export function useIsDark() {
  return useColorScheme() === 'dark';
}

type PillColors = { bg: string; fg: string };

const STATUS_COLORS: Record<OrderStatus | 'late', { light: PillColors; dark: PillColors }> = {
  // Four meanings only: rose = work in progress (the label names the step), red = late, green = done, gray = cancelled.
  new: { light: { bg: '#FCE8EF', fg: '#A8265A' }, dark: { bg: '#3A1624', fg: '#FF8FB4' } },
  in_progress: { light: { bg: '#FCE8EF', fg: '#A8265A' }, dark: { bg: '#3A1624', fg: '#FF8FB4' } },
  awaiting_approval: { light: { bg: '#FCE8EF', fg: '#A8265A' }, dark: { bg: '#3A1624', fg: '#FF8FB4' } },
  delivering: { light: { bg: '#FCE8EF', fg: '#A8265A' }, dark: { bg: '#3A1624', fg: '#FF8FB4' } },
  delivered: { light: { bg: '#E3F5E7', fg: '#1A6E2E' }, dark: { bg: '#123020', fg: '#6FDB8A' } },
  cancelled: { light: { bg: '#EDEDF0', fg: '#5E5E64' }, dark: { bg: '#2C2C2E', fg: '#AEAEB2' } },
  late: { light: { bg: '#FFE8E8', fg: '#B00018' }, dark: { bg: '#3A1517', fg: '#FF8A85' } },
};

export function useStatusColors(status: OrderStatus | 'late'): PillColors {
  return STATUS_COLORS[status][useIsDark() ? 'dark' : 'light'];
}

/** iOS text styles at the default Dynamic Type size; RN scales them with the user's setting. */
export const Type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 22 },
  callout: { fontSize: 16, lineHeight: 21 },
  subhead: { fontSize: 15, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
};

export const tabular = { fontVariant: ['tabular-nums' as const] };

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { cell: 12, control: 10, pill: 999 } as const;
export const MaxWidth = 720;
