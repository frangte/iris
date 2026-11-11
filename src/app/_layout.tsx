import '@/global.css';

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';

import { ToastProvider } from '@/components/toast';
import { useRealtime } from '@/lib/realtime';
import { SessionProvider, useSession } from '@/lib/session';
import { useColors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

// Refetch on returning to the app, like a browser tab regaining focus.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
}

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
  );
  const scheme = useColorScheme();
  const c = useColors();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.tintHex, background: scheme === 'dark' ? '#000000' : '#F2F2F7' },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={theme}>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const { booting, signedIn, me, shop } = useSession();
  const c = useColors();
  const hasShop = Boolean(shop);
  useRealtime(shop?.id ?? null, signedIn && Boolean(me));

  useEffect(() => {
    if (!booting) SplashScreen.hideAsync();
  }, [booting]);

  if (booting) return null;

  return (
    <Stack
      screenOptions={{
        headerTintColor: c.tintHex,
        headerTitleStyle: { color: c.labelHex },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.groupedBackground as string },
        contentStyle: { backgroundColor: c.groupedBackground as string },
      }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !hasShop}>
        <Stack.Screen name="onboarding" options={{ title: 'Bắt đầu', headerLargeTitleEnabled: true }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && hasShop}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/new" options={{ presentation: 'modal', title: 'Đơn mới' }} />
        <Stack.Screen name="order/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="order/[id]/edit" options={{ presentation: 'modal', title: 'Sửa đơn' }} />
        <Stack.Screen name="customer/[id]" options={{ title: '' }} />
      </Stack.Protected>

      {/* Reachable signed out too: it stores the code and sends you to sign in. */}
      <Stack.Screen name="join/[code]" options={{ title: 'Lời mời', presentation: 'modal' }} />
    </Stack>
  );
}
