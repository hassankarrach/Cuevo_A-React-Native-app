import { useThemedStyles } from '../../theme/useThemedStyles';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import AuthField from '../auth/AuthField';
import { passwordError } from '../auth/authValidation';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuth } from '../../state/AuthContext';
import { ApiError } from '../../api/client';
import { registrationError } from '../../api/registration';
import { settingsStyles as baseStyles } from './settingsStyles';

export default function ChangePasswordForm() {
  const styles = useThemedStyles(baseStyles);

  const { changePassword } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({ current: '', password: '', confirmation: '' });
  const [complete, setComplete] = useState(false);
  async function save() {
    if (pending.current) return;
    const next = { current: current ? '' : 'Enter your current password.', password: passwordError(password) || (current === password ? 'Choose a different password.' : ''), confirmation: confirmation && confirmation === password ? '' : 'Passwords don’t match.' };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setError('');
    if (Date.now() < retryAt) { setError(`Try again in ${Math.ceil((retryAt - Date.now()) / 1000)} seconds.`); return; }
    Keyboard.dismiss(); pending.current = true; setSubmitting(true);
    try {
      await changePassword(current, password);
      if (mounted.current) { setCurrent(''); setPassword(''); setConfirmation(''); setComplete(true); }
    } catch (error) {
      if (mounted.current) {
        if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') setErrors(e => ({ ...e, current: 'Current password is incorrect.' }));
        else setError(error instanceof Error && error.name !== 'ApiError' ? error.message : registrationError(error));
        if (error instanceof ApiError && error.retryAfterSeconds) setRetryAt(Date.now() + error.retryAfterSeconds * 1000);
      }
    } finally { pending.current = false; if (mounted.current) setSubmitting(false); }
  }
  if (complete) return <View style={styles.form}><Text style={styles.heading}>Password updated</Text><Text style={styles.note}>Your password is saved. You’re still signed in on this device; other sessions have been signed out.</Text></View>;
  return <View style={styles.form}>
    <View pointerEvents={submitting ? 'none' : 'auto'} style={{ gap: 16 }}>
    <AuthField label="Current password" kind="password" currentPassword value={current} onChangeText={text => { setCurrent(text); setErrors(e => ({ ...e, current: '', password: '' })); }} error={errors.current} />
    <AuthField label="New password" kind="password" value={password} onChangeText={text => { setPassword(text); setErrors(e => ({ ...e, password: '', confirmation: '' })); }} error={errors.password} hint="Use at least 8 characters." />
    <AuthField label="Confirm new password" kind="password" value={confirmation} onChangeText={text => { setConfirmation(text); setErrors(e => ({ ...e, confirmation: '' })); }} error={errors.confirmation} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <PrimaryButton label={submitting ? 'Updating password…' : 'Update password'} disabled={submitting} onPress={save} />
  </View>;
}
