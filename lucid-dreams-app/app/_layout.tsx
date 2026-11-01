import { ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthContext';

import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

const CustomTheme = {
  dark: false,
  colors: {
    primary: '#2D2D2D',
    background: '#F9F9F7',
    card: '#F9F9F7',
    text: '#2D2D2D',
    border: 'transparent',
    notification: '#2D2D2D',
  },
  fonts: {
    regular: {
      fontFamily: 'Manrope_400Regular',
      fontWeight: 'normal' as const,
    },
    medium: {
      fontFamily: 'Manrope_500Medium',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'Manrope_600SemiBold',
      fontWeight: '600' as const,
    },
    heavy: {
      fontFamily: 'Manrope_700Bold',
      fontWeight: '700' as const,
    },
  },
};



import React, { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import EMAModal from '../components/EMAModal';
import { requestEMAPermissions, scheduleEMANotifications } from '../utils/notifications';
import { authenticatedFetch, BACKEND_URL } from '../utils/api';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [showGlobalEMA, setShowGlobalEMA] = useState(false);
  const [emaTrigger, setEmaTrigger] = useState<'notification' | 'app_open' | 'manual'>('app_open');

  // Handle auth redirection
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'callback' || segments[0] === 'insights';
    const isOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && !user.hasCompletedOnboarding) {
      if (!isOnboarding) {
        router.replace('/onboarding');
      }
    } else if (user && (inAuthGroup || isOnboarding)) {
      router.replace('/');
    }
  }, [user, loading, segments, router]);

  // Handle notification setup & triggers
  useEffect(() => {
    if (!user) return;

    // 1. Request permissions and schedule daily notifications
    requestEMAPermissions().then((granted) => {
      if (granted) {
        scheduleEMANotifications();
      }
    });

    // 2. Notification response listener (user tapped a notification)
    let subscription: any = null;
    if (Platform.OS !== 'web' && !isExpoGo) {
      try {
        const Notifications = require('expo-notifications');
        subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data;
          if (data?.type === 'ema_checkin') {
            setEmaTrigger('notification');
            setShowGlobalEMA(true);
          }
        });
      } catch (e) {}
    }

    // 3. Periodic app open check: if >4 hours since last EMA entry, prompt after 2s
    let timeoutId: any = null;
    async function checkLastEMATime() {
      try {
        let lastTimeStr: string | null = null;
        if (Platform.OS === 'web') {
          lastTimeStr = localStorage.getItem('last_ema_checkin_timestamp');
        } else {
          lastTimeStr = await SecureStore.getItemAsync('last_ema_checkin_timestamp');
        }

        const now = Date.now();
        const fourHoursMs = 4 * 60 * 60 * 1000;

        if (!lastTimeStr || (now - Number(lastTimeStr)) > fourHoursMs) {
          // Delay prompt by 2 seconds so as not to disrupt initial app launch
          timeoutId = setTimeout(() => {
            setEmaTrigger('app_open');
            setShowGlobalEMA(true);
          }, 2000);
        }
      } catch (err) {
        console.error('Error checking last EMA time:', err);
      }
    }

    checkLastEMATime();

    return () => {
      if (subscription?.remove) subscription.remove();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

  const handleEMASubmitted = async () => {
    try {
      const nowStr = String(Date.now());
      if (Platform.OS === 'web') {
        localStorage.setItem('last_ema_checkin_timestamp', nowStr);
      } else {
        await SecureStore.setItemAsync('last_ema_checkin_timestamp', nowStr);
      }
    } catch (e) {}
  };

  if (loading) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dream/[id]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="safety-plan" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="profile" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="memory-support" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="heart-rate" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="heart-rate-capture" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="callback" options={{ headerShown: false }} />
        <Stack.Screen name="insights" options={{ headerShown: false }} />
      </Stack>

      <EMAModal
        visible={showGlobalEMA}
        onClose={() => setShowGlobalEMA(false)}
        triggeredBy={emaTrigger}
        onSubmitted={handleEMASubmitted}
      />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={CustomTheme}>
          <RootLayoutNav />
          <StatusBar style="dark" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
