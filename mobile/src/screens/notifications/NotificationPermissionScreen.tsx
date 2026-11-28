import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { authFlowStyles } from '../auth/authFlowStyles';

export default function NotificationPermissionScreen() {
  const continueToIntroduction = useCallback(() => router.replace('/introduction'), []);
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <NotificationPermissionForm onContinue={continueToIntroduction} />
    </ScrollView>
  </SafeAreaView>;
}

export function NotificationPermissionForm({ onContinue }: { onContinue: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  async function next() {
    if (requesting) return;
    if (!enabled || Platform.OS === 'web') { onContinue(); return; }
    setRequesting(true);
    setError('');
    try {
      const notifications = await import('expo-notifications');
      const permission = await notifications.getPermissionsAsync();
      if (permission.status === 'undetermined' && permission.canAskAgain) {
        if (Platform.OS === 'android') {
          await notifications.setNotificationChannelAsync('default', {
            name: 'Cuevo notifications',
            importance: notifications.AndroidImportance.DEFAULT,
          });
        }
        await notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
      }
      onContinue();
    } catch {
      setError('Couldn’t request permission. Try again, or turn off notifications to continue.');
    } finally {
      setRequesting(false);
    }
  }

  return <View style={authFlowStyles.form}>
    <Image source={require('../../../assets/illustrations/cuevo-notifications.png')} resizeMode="contain" style={styles.artwork} accessible={false} />
    <Text accessibilityRole="header" style={authFlowStyles.heading}>Don’t miss an invite.</Text>
    <Text style={authFlowStyles.description}>Get notified when your people invite you to a room or a shared playlist.</Text>
    <View style={styles.preference}>
      <Text style={styles.preferenceLabel}>Allow notifications</Text>
      <Switch value={enabled} onValueChange={setEnabled} disabled={requesting} accessibilityLabel="Allow notifications" trackColor={{ false: '#D8D3CF', true: colors.primary }} thumbColor="#FFFFFF" />
    </View>
    <Text style={styles.hint}>You can change notification permissions anytime in your phone’s settings.</Text>
    {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <PrimaryButton label={requesting ? 'Please wait…' : 'Next'} showArrow disabled={requesting} onPress={next} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFCF8' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  artwork: { width: 220, height: 150, alignSelf: 'center' },
  preference: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  preferenceLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  error: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: '#B33820' },
});
