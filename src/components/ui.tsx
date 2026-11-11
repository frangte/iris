import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { OrderStatus } from '@shared/domain';
import { MaxWidth, Radius, Space, tabular, Type, useColors, useStatusColors } from '@/lib/theme';
import { Icon, type IconName } from './icon';

// ---------------------------------------------------------------- Text

type TextProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: keyof typeof Type;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'tint' | 'danger' | 'success';
  numberOfLines?: number;
  money?: boolean;
  selectable?: boolean;
};

export function T({ children, style, variant = 'body', tone = 'primary', numberOfLines, money, selectable }: TextProps) {
  const c = useColors();
  const color = {
    primary: c.label,
    secondary: c.secondaryLabel,
    tertiary: c.tertiaryLabel,
    tint: c.tint,
    danger: c.danger,
    success: c.success,
  }[tone];
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[Type[variant], { color }, money && tabular, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- Screen

type ScreenProps = ScrollViewProps & {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Grouped-background scroll screen. Works under a large-title native header. */
export function Screen({ children, refreshing, onRefresh, contentContainerStyle, ...rest }: ScreenProps) {
  const c = useColors();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: c.groupedBackground }}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
      {...rest}>
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

/**
 * Web has no native large-title header: the tab roots draw their title in the
 * content column instead (and hide the inline header there).
 */
export function WebTitle({ title, action }: { title: string; action?: ReactNode }) {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={styles.webTitle}>
      <T variant="largeTitle" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </T>
      {action}
    </View>
  );
}

/** Tab roots hide the header on web, where WebTitle stands in. */
export const tabRootHeader = Platform.OS === 'web' ? { headerShown: false } : {};

// ---------------------------------------------------------------- Section

type SectionProps = {
  title?: string;
  footer?: string;
  children: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** No white container; for content that draws its own surface (tiles, buttons). */
  bare?: boolean;
};

/** iOS inset-grouped section. Separators are drawn between direct children. */
export function Section({ title, footer, children, right, style, bare }: SectionProps) {
  const c = useColors();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.sectionHeader}>
          <T variant="footnote" tone="secondary" style={styles.sectionTitle}>
            {title.toLocaleUpperCase('vi')}
          </T>
          {right}
        </View>
      ) : null}
      {bare ? (
        children
      ) : (
        <View style={[styles.group, { backgroundColor: c.cell }]}>
          {rows.map((row, i) => (
            <Fragment key={row.key ?? i}>
              {i > 0 ? <View style={[styles.separator, { backgroundColor: c.separator }]} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      )}
      {footer ? (
        <T variant="footnote" tone="secondary" style={styles.sectionFooter}>
          {footer}
        </T>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Rows

type RowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  icon?: IconName;
  iconColor?: ColorValue;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
};

export function Row({ title, subtitle, detail, icon, iconColor, onPress, chevron, destructive, accessibilityLabel }: RowProps) {
  const c = useColors();
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Icon name={icon} size={20} color={iconColor ?? (destructive ? c.danger : c.tint)} />
        </View>
      ) : null}
      <View style={styles.rowMain}>
        {typeof title === 'string' ? (
          <T tone={destructive ? 'danger' : 'primary'} numberOfLines={2}>
            {title}
          </T>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <T variant="subhead" tone="secondary" numberOfLines={2}>
              {subtitle}
            </T>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {detail !== undefined ? (
        <View style={styles.rowDetail}>
          {typeof detail === 'string' ? (
            <T tone="secondary" numberOfLines={1}>
              {detail}
            </T>
          ) : (
            detail
          )}
        </View>
      ) : null}
      {chevron ? <Icon name="chevron" size={14} color={c.tertiaryLabel} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [pressed && { backgroundColor: c.cellPressed }]}>
      {content}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Inputs

type FieldProps = TextInputProps & { label?: string; suffix?: string; error?: string | null };

/** A labelled text input that sits inside a Section like a settings row. */
export function Field({ label, suffix, error, style, onFocus, onBlur, ...input }: FieldProps) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  // Web: the whole row carries the focus ring (an inset outline survives the group's overflow clip).
  const ring = Platform.OS === 'web' && focused ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: c.tintHex, outlineOffset: -2 } as ViewStyle) : null;
  return (
    <View>
      <View style={[styles.field, input.multiline && styles.fieldMultiline, ring]}>
        {label ? (
          <T style={styles.fieldLabel} numberOfLines={1}>
            {label}
          </T>
        ) : null}
        <TextInput
          placeholderTextColor={c.placeholder as string}
          selectionColor={c.tint as string}
          style={[Type.body, styles.fieldInput, { color: c.label as string }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...input}
        />
        {suffix ? <T tone="secondary">{suffix}</T> : null}
      </View>
      {error ? (
        <T variant="footnote" tone="danger" style={styles.fieldError}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Buttons

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'filled' | 'tinted' | 'plain' | 'destructive';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Button({ title, onPress, variant = 'filled', icon, loading, disabled, style, small }: ButtonProps) {
  const c = useColors();
  const look = {
    filled: { bg: c.tintFill, fg: c.onTint },
    tinted: { bg: c.tintSoft, fg: c.tint },
    plain: { bg: 'transparent', fg: c.tint },
    destructive: { bg: c.dangerSoft, fg: c.danger },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: look.bg },
        pressed && { opacity: 0.7 },
        inactive && !loading && { opacity: 0.4 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={look.fg as string} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={look.fg} /> : null}
          <Text style={[small ? Type.subhead : Type.headline, { color: look.fg, fontWeight: '600' }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Small selectable capsule, for channel / quick date / time slot choices. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.tintFill : c.fill },
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={[Type.subhead, { color: selected ? c.onTint : c.label, fontWeight: selected ? '600' : '400' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Status & summary

export function Pill({ status, label }: { status: OrderStatus | 'late'; label: string }) {
  const { bg, fg } = useStatusColors(status);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[Type.caption, { color: fg, fontWeight: '600' }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Tile({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'tint' }) {
  const c = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.cell }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <T variant="footnote" tone="secondary" numberOfLines={1}>
        {label}
      </T>
      <T variant="title2" tone={tone ?? 'primary'} money numberOfLines={1} style={styles.tileValue}>
        {value}
      </T>
    </View>
  );
}

// ---------------------------------------------------------------- States

export function Empty({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {message ? (
        <T variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>
          {message}
        </T>
      ) : null}
      {action ? <View style={{ marginTop: Space.md }}>{action}</View> : null}
    </View>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const c = useColors();
  const message = error instanceof Error ? error.message : 'Có lỗi xảy ra';
  return (
    <View style={[styles.errorNote, { backgroundColor: c.dangerSoft }]} accessibilityRole="alert">
      <T variant="subhead" tone="danger" style={{ flex: 1 }}>
        {message}
      </T>
      {onRetry ? <Button title="Thử lại" variant="plain" small onPress={onRetry} /> : null}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={[styles.loading, { backgroundColor: c.groupedBackground }]}>
      <ActivityIndicator />
    </View>
  );
}

/** Placeholder rows while a list loads: keeps layout steady instead of a centered spinner. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const c = useColors();
  return (
    <Section>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={[styles.skeletonBar, { width: '55%', backgroundColor: c.fill }]} />
          <View style={[styles.skeletonBar, { width: '35%', height: 10, backgroundColor: c.fill }]} />
        </View>
      ))}
    </Section>
  );
}

export const styles = StyleSheet.create({
  screenContent: { paddingBottom: Space.xxl * 2, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxWidth, paddingHorizontal: Space.lg },
  section: { marginTop: Space.xl },
  webTitle: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingTop: Space.xl, paddingHorizontal: Space.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    marginBottom: Space.sm - 2,
    minHeight: 18,
  },
  sectionTitle: { letterSpacing: 0.2 },
  sectionFooter: { paddingHorizontal: Space.lg, marginTop: Space.sm - 2 },
  group: { borderRadius: Radius.cell, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Space.lg },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: Space.lg, paddingVertical: 11, gap: Space.md },
  rowIcon: { width: 24, alignItems: 'center' },
  rowMain: { flex: 1, gap: 2 },
  rowDetail: { alignItems: 'flex-end', gap: 4, maxWidth: '55%' },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: Space.lg, gap: Space.md },
  fieldMultiline: { alignItems: 'flex-start', paddingTop: 1 },
  fieldLabel: { width: 92, paddingVertical: 12 },
  fieldInput: { flex: 1, paddingVertical: 12, ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null) } as TextStyle,
  fieldError: { paddingHorizontal: Space.lg, paddingBottom: Space.sm },
  button: {
    minHeight: 50,
    borderRadius: Radius.cell,
    paddingHorizontal: Space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  buttonSmall: { minHeight: 36, borderRadius: Radius.control, paddingHorizontal: Space.md },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: Radius.pill, justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-end' },
  tile: { flex: 1, borderRadius: Radius.cell, padding: Space.md, gap: 2, minWidth: 0 },
  tileValue: { marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: Space.xxl, paddingHorizontal: Space.xl, gap: Space.xs },
  errorNote: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.cell, padding: Space.md, marginTop: Space.lg, gap: Space.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonRow: { paddingHorizontal: Space.lg, paddingVertical: 14, gap: 8 },
  skeletonBar: { height: 14, borderRadius: 4 },
});
