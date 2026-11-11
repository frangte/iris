import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space, Type } from '@/lib/theme';

type ToastFn = (message: string) => void;
const ToastContext = createContext<ToastFn>(() => {});

/** Transient confirmation ("Đã chép…"). Announced to VoiceOver; fades, no slide. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const show = useCallback<ToastFn>((m) => {
    clearTimeout(timer.current);
    setMessage(m);
    AccessibilityInfo.announceForAccessibility(m);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 96 }]}>
          <Animated.Text entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} style={[Type.subhead, styles.toast]}>
            {message}
          </Animated.Text>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Space.xl },
  toast: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    color: '#FFFFFF',
    fontWeight: '600',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.cell,
    overflow: 'hidden',
    textAlign: 'center',
    maxWidth: 420,
  },
});
