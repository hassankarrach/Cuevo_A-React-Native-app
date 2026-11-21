import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { showToast } from '../../utils/toast';
import AuthField from './AuthField';
import { authFlowStyles as styles } from './authFlowStyles';
import { challengeLifetimeMs, codeError, passwordError } from './authValidation';
import { useResendCooldown } from './useResendCooldown';

export default function ResetPasswordForm({ email, expiresAt: initialExpiry, onLogin, onChangeEmail }: {
  email: string; expiresAt: number; onLogin: () => void; onChangeEmail: () => void;
}) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({ code: '', password: '', confirmation: '' });
  const [expiresAt, setExpiresAt] = useState(initialExpiry);
  const [complete, setComplete] = useState(false);
  const { seconds, restart } = useResendCooldown(30, initialExpiry - challengeLifetimeMs);
  function reset() {
    const next = { code: codeError(code, expiresAt), password: passwordError(password), confirmation: password === confirmation && confirmation ? '' : 'Passwords don’t match.' };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    Keyboard.dismiss();
    setPassword(''); setConfirmation(''); setCode('');
    setComplete(true);
  }
  return <View style={styles.form}>
    <View style={styles.icon}><Ionicons name={complete ? 'checkmark-circle' : 'lock-closed'} size={36} color={colors.primary} /></View>
    <Text accessibilityRole="header" style={styles.heading}>{complete ? 'A fresh start.' : 'Choose a new password.'}</Text>
    {complete ? <>
      <Text style={styles.description}>Your password has been updated. You can now return to log in.</Text>
      <PrimaryButton label="Back to log in" onPress={onLogin} />
    </> : <>
      <Text style={styles.description}>Enter the reset code for <Text style={styles.email}>{email}</Text> and choose your new password.</Text>
      <AuthField label="Reset code" kind="code" value={code} onChangeText={value => { setCode(value); setErrors(current => ({ ...current, code: '' })); }} error={errors.code} />
      <AuthField label="New password" kind="password" value={password} onChangeText={value => { setPassword(value); setErrors(current => ({ ...current, password: '', confirmation: '' })); }} error={errors.password} hint="Use at least 8 characters." />
      <AuthField label="Confirm new password" kind="password" value={confirmation} onChangeText={value => { setConfirmation(value); setErrors(current => ({ ...current, confirmation: '' })); }} error={errors.confirmation} />
      <PrimaryButton label="Reset password" onPress={reset} />
      <View style={styles.actions}>
        <Pressable disabled={seconds > 0} onPress={() => { setExpiresAt(Date.now() + challengeLifetimeMs); setCode(''); setErrors(current => ({ ...current, code: '' })); restart(); showToast('success', 'Reset code requested'); }} accessibilityRole="button" accessibilityState={{ disabled: seconds > 0 }} style={styles.link}><Text style={[styles.linkText, seconds > 0 && styles.muted]}>{seconds > 0 ? `Resend code in ${seconds}s` : 'Resend code'}</Text></Pressable>
        <Pressable onPress={onChangeEmail} accessibilityRole="button" style={styles.link}><Text style={styles.linkText}>Use another email</Text></Pressable>
      </View>
    </>}
  </View>;
}
