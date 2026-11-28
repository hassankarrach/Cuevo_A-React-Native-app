import { Redirect, useSegments } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAuth } from '../state/AuthContext';
import { colors } from '../theme/colors';
import type { ReactNode } from 'react';

export default function SessionGate({ children }: { children: ReactNode }) {
  const { account, loading, error, retry } = useAuth();
  const segments = useSegments();
  if (loading || error) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: colors.background }}>
    {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel="Restoring session" /> : <>
      <Text accessibilityRole="alert">{error}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void retry(); }}><Text>Try again</Text></Pressable>
    </>}
  </View>;
  if (!account && segments.length > 0) return <Redirect href="/" />;
  return children;
}
