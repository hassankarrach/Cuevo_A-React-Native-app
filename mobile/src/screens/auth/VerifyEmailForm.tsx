import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { showToast } from '../../utils/toast';
import AuthField from './AuthField';
import { authFlowStyles as styles } from './authFlowStyles';
import { challengeLifetimeMs, codeError } from './authValidation';
import { useResendCooldown } from './useResendCooldown';

export default function VerifyEmailForm({ email, onVerified, onChangeEmail }: { email: string; onVerified: () => void; onChangeEmail: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + challengeLifetimeMs);
  const { seconds, restart } = useResendCooldown();
  function verify() {
    const invalid = codeError(code, expiresAt);
    setError(invalid);
    if (invalid) return;
    Keyboard.dismiss(); setCode(''); setVerified(true);
  }
  return <View style={styles.form}>
    <View style={styles.icon}><Ionicons name={verified ? 'checkmark-circle' : 'mail'} size={36} color={colors.primary} /></View>
    <Text accessibilityRole="header" style={styles.heading}>{verified ? 'You’re all set.' : 'Make it official.'}</Text>
    {verified ? <>
      <Text style={styles.description}>Your email is verified. Let’s put a name and face to your music.</Text>
      <PrimaryButton label="Set up your profile" onPress={onVerified} />
    </> : <>
      <Text style={styles.description}>Enter the 6-digit verification code for <Text style={styles.email}>{email}</Text>.</Text>
      <AuthField label="Verification code" kind="code" value={code} onChangeText={value => { setCode(value); setError(''); }} error={error} />
      <PrimaryButton label="Verify email" onPress={verify} />
      <View style={styles.actions}>
        <Pressable disabled={seconds > 0} onPress={() => { setExpiresAt(Date.now() + challengeLifetimeMs); setCode(''); setError(''); restart(); showToast('success', 'Verification code requested'); }} accessibilityRole="button" accessibilityState={{ disabled: seconds > 0 }} style={styles.link}><Text style={[styles.linkText, seconds > 0 && styles.muted]}>{seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}</Text></Pressable>
        <Pressable onPress={onChangeEmail} accessibilityRole="button" style={styles.link}><Text style={styles.linkText}>Use another email</Text></Pressable>
      </View>
    </>}
  </View>;
}
