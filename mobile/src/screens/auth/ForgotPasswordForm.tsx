import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { showToast } from '../../utils/toast';
import AuthField from './AuthField';
import { authFlowStyles as styles } from './authFlowStyles';
import { challengeLifetimeMs, emailError } from './authValidation';
import { useResendCooldown } from './useResendCooldown';

export default function ForgotPasswordForm({ onReset, onLogin }: { onReset: (email: string, expiresAt: number) => void; onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const { seconds, restart } = useResendCooldown(0);
  function send() {
    const invalid = emailError(email);
    setError(invalid);
    if (invalid) return;
    Keyboard.dismiss();
    setEmail(email.trim());
    setExpiresAt(Date.now() + challengeLifetimeMs);
    setSent(true);
    restart();
  }
  return <View style={styles.form}>
    <View style={styles.icon}><Ionicons name={sent ? 'mail-open' : 'key'} size={36} color={colors.primary} /></View>
    <Text accessibilityRole="header" style={styles.heading}>{sent ? 'Check your inbox.' : 'Let’s get you back in.'}</Text>
    {sent ? <>
      <Text style={styles.description}>If an account exists for <Text style={styles.email}>{email}</Text>, you’ll receive a code to reset your password. Check your spam folder too.</Text>
      <PrimaryButton label="Enter reset code" onPress={() => onReset(email, expiresAt)} />
      <View style={styles.actions}>
        <Pressable disabled={seconds > 0} onPress={() => { send(); showToast('success', 'Reset code requested'); }} accessibilityRole="button" accessibilityState={{ disabled: seconds > 0 }} style={styles.link}><Text style={[styles.linkText, seconds > 0 && styles.muted]}>{seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}</Text></Pressable>
        <Pressable onPress={() => setSent(false)} accessibilityRole="button" style={styles.link}><Text style={styles.linkText}>Use another email</Text></Pressable>
      </View>
    </> : <>
      <Text style={styles.description}>Enter your account email and we’ll help you reset your password.</Text>
      <AuthField label="Email address" value={email} onChangeText={value => { setEmail(value); setError(''); }} error={error} />
      <PrimaryButton label="Send reset code" onPress={send} />
    </>}
    <Pressable onPress={onLogin} accessibilityRole="button" style={styles.link}><Text style={styles.linkText}>Back to log in</Text></Pressable>
  </View>;
}
