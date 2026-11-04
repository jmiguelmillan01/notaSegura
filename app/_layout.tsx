import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useAppStore } from '../src/store/useAppStore';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const fetchData = useAppStore((state) => state.fetchData);
  const isOfflineMode = useAppStore((state) => state.isOfflineMode);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data }) => {
        setHasSession(!!data.session);
        setAuthChecked(true);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setHasSession(!!session);
        if (_event === 'SIGNED_OUT') {
          useAppStore.getState().clearStore();
        } else if (_event === 'SIGNED_IN' && session) {
          await useAppStore.getState().fetchData();
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && authChecked) {
      SplashScreen.hideAsync();
    }
  }, [loaded, authChecked]);

  useEffect(() => {
    if (!loaded || !authChecked) return;

    const currentRoute = segments[0] as string | undefined;
    const inAuthGroup = currentRoute === 'welcome' || currentRoute === 'login' || currentRoute === 'signup' || currentRoute === 'reset-password';

    if (!hasSession && !isOfflineMode && !inAuthGroup) {
      // Si no tiene sesión (ni permanente ni anónima ni modo offline activo), redirigir a la pantalla de bienvenida
      router.replace('/welcome' as any);
    }
  }, [loaded, authChecked, hasSession, segments]);

  if (!loaded || !authChecked) {
    return null;
  }

  return <RootLayoutNav />;
}

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#121212',
    text: '#FFFFFF',
    border: '#27272A',
    primary: '#4F46E5',
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
