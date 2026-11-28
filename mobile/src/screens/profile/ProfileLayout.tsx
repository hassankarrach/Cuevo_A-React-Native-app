import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileStyles as baseStyles } from './profileStyles';

export function goBackFromProfile() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

export default function ProfileLayout({ title, children }: { title: string; children: ReactNode }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const goBack = goBackFromProfile;
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <StatusBar style={colors.dark ? 'light' : 'dark'} />
    <View style={styles.page}>
      <View pointerEvents="box-none" style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="arrow-back" size={23} color={colors.text} accessible={false} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>
        <View style={styles.back} />
      </View>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  </SafeAreaView>;
}
