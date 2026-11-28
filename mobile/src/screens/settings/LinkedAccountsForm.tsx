import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { googleIdToken } from '../../api/googleNative';
import { registrationError } from '../../api/registration';
import { ApiError } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { useAppColors } from '../../theme/useAppColors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { settingsStyles } from './settingsStyles';

type Methods = { googleLinked: boolean; passwordEnabled: boolean };
export default function LinkedAccountsForm() {
  const { request, linkGoogle, unlinkGoogle } = useAuth();
  const styles = useThemedStyles(settingsStyles);
  const colors = useAppColors();
  const [methods, setMethods] = useState<Methods | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  const pending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void request('/api/v1/me/linked-accounts').then(data => {
      const value = data as Methods | null;
      if (!value || typeof value.googleLinked !== 'boolean' || typeof value.passwordEnabled !== 'boolean') throw new ApiError('Unable to load linked accounts.', 'INVALID_RESPONSE', 200);
      if (active) setMethods(value);
    }).catch(error => { if (active) setError(registrationError(error)); });
    return () => { active = false; };
  }, [request, attempt]);
  async function change() {
    if (!methods || pending.current) return;
    if (!password) { setError('Enter your Cuevo password to continue.'); return; }
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (methods.googleLinked) await unlinkGoogle(password);
      else {
        const token = await googleIdToken();
        if (!token) return;
        await linkGoogle(token, password);
      }
      if (mounted.current) { setMethods({ ...methods, googleLinked: !methods.googleLinked }); setNotice(methods.googleLinked ? 'Google disconnected.' : 'Google connected.'); }
    } catch (error) {
      if (mounted.current) setError(error instanceof Error && error.name !== 'ApiError' ? error.message : registrationError(error));
    } finally {
      pending.current = false;
      if (mounted.current) { setPassword(''); setBusy(false); }
    }
  }
  return <View style={styles.form}>
    <Text style={styles.heading}>Google</Text>
    <Text style={styles.note}>{methods ? methods.googleLinked ? 'Connected' : 'Not connected' : 'Loading linked accounts…'}</Text>
    {methods?.passwordEnabled && <>
      <Text style={styles.note}>Confirm your Cuevo password to {methods.googleLinked ? 'disconnect' : 'connect'} Google.</Text>
      <TextInput secureTextEntry textContentType="password" autoComplete="current-password" autoCapitalize="none" autoCorrect={false} editable={!busy} value={password} onChangeText={setPassword} accessibilityLabel="Current Cuevo password" placeholder="Current password" placeholderTextColor={colors.textSecondary} style={styles.input} />
      <PrimaryButton label={busy ? 'Please wait…' : methods.googleLinked ? 'Disconnect Google' : 'Connect Google'} disabled={busy} onPress={change} />
    </>}
    {methods && !methods.passwordEnabled && <Text style={styles.note}>Use password recovery to set a password before changing your Google connection.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.note}>{notice}</Text>}
    {!methods && !!error && <PrimaryButton label="Try again" onPress={() => { setError(''); setAttempt(value => value + 1); }} />}
  </View>;
}
