import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { connectApiToSession } from '@/features/auth';

import { AppStack } from './AppStack';
import { useAppReady } from './useAppReady';

SplashScreen.preventAutoHideAsync();
// Once per app load, never on render: reconnecting re-arms the single expiry notice.
connectApiToSession();

export function RootLayout() {
  const ready = useAppReady();

  useEffect(() => {
    if (ready) {
      SplashScreen.hide();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppStack />
    </SafeAreaProvider>
  );
}
