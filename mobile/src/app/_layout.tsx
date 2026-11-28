import { ThemeProvider } from '../theme/ThemeContext';
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
import { ToastViewport } from '../components/AppToast';
import AndroidNavigationBar from '../components/AndroidNavigationBar';
import { fontAssets } from '../theme/fonts';
import { AuthProvider, useAuth } from '../state/AuthContext';
import SessionGate from '../components/SessionGate';

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
    <ThemeProvider><SafeAreaProvider>
      <AndroidNavigationBar />
      <ToastViewport>
        <AuthProvider><SessionGate><AccountProviders /></SessionGate></AuthProvider>
      </ToastViewport>
    </SafeAreaProvider></ThemeProvider>
  );
}

function AccountProviders() {
  const { account } = useAuth();
  return <SettingsProvider key={account?.id ?? 'signed-out'}><BillingProvider><ProfileProvider>
    <MockRoomsProvider><PlaylistsProvider><Stack screenOptions={{ headerShown: false }} /></PlaylistsProvider></MockRoomsProvider>
  </ProfileProvider></BillingProvider></SettingsProvider>;
}
