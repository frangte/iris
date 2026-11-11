import { Alert, Platform } from 'react-native';

/**
 * Native confirmation (UIAlertController / AlertDialog). RN's Alert is a
 * no-op on web, so the browser's confirm stands in there.
 */
export function confirm(opts: { title: string; message?: string; confirm: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm([opts.title, opts.message].filter(Boolean).join('\n\n')));
  }
  return new Promise((resolve) => {
    Alert.alert(opts.title, opts.message, [
      { text: 'Huỷ', style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirm, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert([title, message].filter(Boolean).join('\n\n'));
  else Alert.alert(title, message);
}
