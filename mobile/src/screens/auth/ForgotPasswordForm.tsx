import { useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import AuthField from './AuthField';
import { authFlowStyles as styles } from './authFlowStyles';
import { emailError } from './authValidation';
import { useRecoveryRequest } from './useRecoveryRequest';

export default function ForgotPasswordForm({ onReset, onLogin, initialEmail, resendAt, onRequested }: {
  onReset: () => void; onLogin: () => void; initialEmail: string; resendAt: number;
  onRequested: (email: string, deadline: number) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const { send, busy, error, setError, seconds } = useRecoveryRequest(resendAt, onRequested);
  async function request() {
    const invalid = emailError(email);
    setError(invalid);
    if (invalid) return;
    Keyboard.dismiss();
    if (await send(email)) { setEmail(email.trim().toLowerCase()); setSent(true); }
  }
  return <View style={styles.form}>
    <Image
      source={sent
        ? require('../../../assets/illustrations/cuevo-check-inbox.png')
        : require('../../../assets/illustrations/cuevo-forgot-password-v2.png')}
      style={illustrationStyles.artwork}
      resizeMode="contain"
      accessible={false}
    />
    <Text accessibilityRole="header" style={styles.heading}>{sent ? 'Check your inbox.' : 'Let’s get you back in.'}</Text>
    {sent ? <>
      <Text style={styles.description}>If an account exists for <Text style={styles.email}>{email}</Text>, you’ll receive a code to reset your password. Check your spam folder too.</Text>
      <PrimaryButton label="Enter reset code" disabled={busy} onPress={onReset} />
      <View style={styles.actions}>
        <Pressable disabled={busy || seconds > 0} onPress={request} accessibilityRole="button" accessibilityState={{ disabled: busy || seconds > 0 }} style={styles.link}><Text style={[styles.linkText, (busy || seconds > 0) && styles.muted]}>{busy ? 'Sending…' : seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}</Text></Pressable>
      </View>
    </> : <>
      <Text style={styles.description}>Enter your account email and we’ll help you reset your password.</Text>
      <View pointerEvents={busy ? 'none' : 'auto'}><AuthField label="Email address" value={email} onChangeText={value => { setEmail(value); setError(''); }}  /></View>
      <PrimaryButton label={busy ? 'Sending…' : seconds > 0 ? `Try again in ${seconds}s` : 'Send reset code'} disabled={busy || seconds > 0} onPress={request} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={illustrationStyles.error}>{error}</Text>}
    {!sent && <Pressable disabled={busy} onPress={onLogin} accessibilityRole="button" style={styles.link}><Text style={styles.linkText}>Back to log in</Text></Pressable>}
  </View>;
}

const illustrationStyles = StyleSheet.create({
  error: { color: '#C5392A', fontSize: 13, lineHeight: 20 },
  artwork: { width: 220, height: 180, alignSelf: 'center' },
});
