import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Radius, Space, Type, useColors } from '@/lib/theme';

/**
 * In-content search for web and Android. iOS uses the native search bar in
 * the navigation header instead (see `headerSearchBarOptions`).
 */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const c = useColors();
  if (Platform.OS === 'ios') return null;
  return (
    <View style={[styles.wrap, { backgroundColor: c.fill }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder as string}
        selectionColor={c.tint as string}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        style={[Type.body, styles.input, { color: c.label as string }, Platform.OS === 'web' && ({ outlineWidth: 0 } as object)]}
      />
    </View>
  );
}

export function iosSearchBar(placeholder: string, onChange: (v: string) => void) {
  if (Platform.OS !== 'ios') return undefined;
  return {
    placeholder,
    hideWhenScrolling: false,
    onChangeText: (e: { nativeEvent: { text: string } }) => onChange(e.nativeEvent.text),
    onCancelButtonPress: () => onChange(''),
  };
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.control, marginTop: Space.md, paddingHorizontal: Space.md },
  input: { minHeight: 40, paddingVertical: 8 },
});
