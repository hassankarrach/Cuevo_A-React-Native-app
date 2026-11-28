import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import AuthField from './AuthField';
import { authFlowStyles as styles } from './authFlowStyles';
import { passwordError } from './authValidation';
import { confirmPasswordReset } from '../../api/passwordRecovery';
import { registrationError } from '../../api/registration';
import { ApiError } from '../../api/client';
import { useRecoveryRequest } from './useRecoveryRequest';

export default function ResetPasswordForm({ email, resendAt, onRequested, onLogin }: {
  email: string; resendAt: number; onRequested: (email: string, deadline: number) => void; onLogin: () => void;
}) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({ code: '', password: '', confirmation: '' });
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const pending = useRef(false);
  const mounted = useRef(false);
  const resend = useRecoveryRequest(resendAt, onRequested);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  async function reset() {
    if (pending.current || resend.busy) return;
    const next = { code: /^\d{6}$/.test(code) ? '' : 'Enter the 6-digit code.', password: passwordError(password), confirmation: password === confirmation && confirmation ? '' : 'Passwords don’t match.' };
    setErrors(next); setError(''); setNotice('');
    if (Object.values(next).some(Boolean)) return;
    if (Date.now() < retryAt) { setError(`Try again in ${Math.ceil((retryAt - Date.now()) / 1000)} seconds.`); return; }
    Keyboard.dismiss(); pending.current = true; setSubmitting(true);
    try {
      await confirmPasswordReset(email, code, password);
      if (mounted.current) { setPassword(''); setConfirmation(''); setCode(''); setComplete(true); }
    } catch (error) {
      if (mounted.current) {
        setError(registrationError(error));
        if (error instanceof ApiError && error.retryAfterSeconds) setRetryAt(Date.now() + error.retryAfterSeconds * 1000);
      }
    } finally { pending.current = false; if (mounted.current) setSubmitting(false); }
  }
  async function resendCode() {
    if (pending.current) return;
    setError(''); setNotice('');
    if (await resend.send(email)) {
      if (mounted.current) { setCode(''); setErrors(current => ({ ...current, code: '' })); setNotice('If the account exists, a new code will arrive in your inbox.'); }
    }
  }
  return <View style={[styles.form, illustrationStyles.form]}>
    <Image
      source={complete
        ? require('../../../assets/illustrations/cuevo-fresh-start.png')
        : require('../../../assets/illustrations/cuevo-reset-password.png')}
      style={[illustrationStyles.artwork, !complete && keyboardVisible && illustrationStyles.hidden]}
      resizeMode="contain"
      accessible={false}
    />
    {complete && <Text accessibilityRole="header" style={styles.heading}>A fresh start.</Text>}
    {complete ? <>
      <Text style={styles.description}>Your password has been updated. You can now return to log in.</Text>
      <PrimaryButton label="Back to log in" onPress={onLogin} />
    </> : <>
      <View pointerEvents={submitting || resend.busy ? 'none' : 'auto'} style={{ gap: 16 }}>
      <AuthField label="Reset code" kind="code" value={code} onChangeText={value => { setCode(value); setErrors(current => ({ ...current, code: '' })); }} error={errors.code} />
      <AuthField label="New password" kind="password" value={password} onChangeText={value => { setPassword(value); setErrors(current => ({ ...current, password: '', confirmation: '' })); }} error={errors.password} hint="Use at least 8 characters." />
      <AuthField label="Confirm new password" hideLabel kind="password" value={confirmation} onChangeText={value => { setConfirmation(value); setErrors(current => ({ ...current, confirmation: '' })); }} error={errors.confirmation} />
      </View>
      {!!(error || resend.error) && <Text accessibilityRole="alert" style={illustrationStyles.error}>{error || resend.error}</Text>}
      <PrimaryButton label={submitting ? 'Updating password…' : 'Reset password'} disabled={submitting || resend.busy} onPress={reset} />
      <Pressable accessibilityRole="button" disabled={submitting || resend.busy || resend.seconds > 0} onPress={resendCode} style={styles.link}>
        <Text style={[styles.linkText, (submitting || resend.busy || resend.seconds > 0) && styles.muted]}>{resend.busy ? 'Sending…' : resend.seconds > 0 ? `Resend code in ${resend.seconds}s` : 'Resend code'}</Text>
      </Pressable>
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.description}>{notice}</Text>}
    </>}
  </View>;
}

const illustrationStyles = StyleSheet.create({
  error: { color: '#C5392A', fontSize: 13, lineHeight: 20 },
  form: { gap: 16, paddingTop: 16, paddingBottom: 16 },
  hidden: { display: 'none' },
  artwork: { width: 220, height: 150, alignSelf: 'center' },
});
