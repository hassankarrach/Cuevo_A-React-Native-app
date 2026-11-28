import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { googleIdToken } from '../api/googleNative';
import { registrationError } from '../api/registration';
import { useAuth } from '../state/AuthContext';
import { fonts } from '../theme/fonts';

export default function GoogleAuthButton({ label, disabled, onBusy, onError }: {
  label: string; disabled: boolean; onBusy: (busy: boolean) => void; onError: (message: string) => void;
}) {
  const { googleLogin } = useAuth();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function signIn() {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); onBusy(true); onError('');
    try { const token = await googleIdToken(); if (token) await googleLogin(token); }
    catch (error) { if (mounted.current) onError(error instanceof Error && error.name !== 'ApiError' ? error.message : registrationError(error)); }
    finally { pending.current = false; if (mounted.current) { setBusy(false); onBusy(false); } }
  }
  return <Pressable disabled={disabled || busy} accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} accessibilityLabel={label} onPress={signIn} style={styles.button}>
    <Image source={require('../../assets/brand/google-g.png')} resizeMode="contain" accessible={false} style={styles.image} />
    <Text style={styles.label}>{busy ? 'Connecting to Google…' : label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: 15, borderWidth: 1, borderColor: '#DADCE0', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  image: { width: 22, height: 22 }, label: { fontFamily: fonts.medium, fontSize: 16, color: '#1F1F1F' },
});
