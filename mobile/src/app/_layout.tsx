import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Stack } from 'expo-router';
import { MockRoomsProvider } from '../state/MockRoomsContext';
import { PlaylistsProvider } from '../state/PlaylistsContext';
import { BillingProvider } from '../state/BillingContext';
import { SettingsProvider } from '../state/SettingsContext';
import { ProfileProvider } from '../state/ProfileContext';
import AppToast from '../components/AppToast';
import { fontAssets } from '../theme/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider><BillingProvider><ProfileProvider>
        <MockRoomsProvider><PlaylistsProvider><Stack screenOptions={{ headerShown: false }} /></PlaylistsProvider></MockRoomsProvider>
      </ProfileProvider></BillingProvider></SettingsProvider>
      <AppToast />
    </SafeAreaProvider>
  );
}
