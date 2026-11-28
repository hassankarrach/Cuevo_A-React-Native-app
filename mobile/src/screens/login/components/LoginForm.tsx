import GoogleAuthButton from '../../../components/GoogleAuthButton';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../../components/PrimaryButton';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';
import LoginFields from './LoginFields';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../state/AuthContext';
import { registrationError } from '../../../api/registration';
import { emailError, passwordError } from '../../auth/authValidation';

export default function LoginForm({ onSignUp, onForgotPassword, initialEmail = '' }: { onSignUp: () => void; onForgotPassword: () => void; initialEmail?: string }) {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: initialEmail, password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function submit() {
    if (pending.current) return;
    const invalid = emailError(credentials.email) || passwordError(credentials.password);
    setError(invalid);
    if (invalid) return;
    pending.current = true;
    setSubmitting(true);
    try { await login(credentials.email, credentials.password); }
    catch (error) { if (mounted.current) setError(error instanceof Error && !(error.name === 'ApiError') ? error.message : registrationError(error)); }
    finally { pending.current = false; if (mounted.current) setSubmitting(false); }
  }
  return (
    <View style={styles.form}>
      <View pointerEvents={submitting ? 'none' : 'auto'}>
        <LoginFields initialEmail={initialEmail} onChange={value => { setCredentials(value); setError(''); }} />
        <Pressable disabled={submitting} onPress={onForgotPassword} accessibilityRole="button" style={styles.forgotButton}>
          <Text style={styles.forgotLabel}>Forgot password?</Text>
        </Pressable>
      </View>

      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <PrimaryButton label={submitting ? 'Signing in…' : 'Log in'} disabled={submitting} onPress={submit} />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleAuthButton label="Sign in with Google" disabled={submitting} onError={setError} onBusy={busy => { pending.current = busy; setSubmitting(busy); }} />


      <Pressable disabled={submitting} onPress={onSignUp} accessibilityRole="button" style={styles.signupButton}>
        <Text style={styles.signupText}>
          New to Cuevo? <Text style={styles.signupLabel}>Create an account</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.regular, fontSize: 12, color: '#C5392A', lineHeight: 18 },
  form: { paddingHorizontal: 12, paddingTop: 24, paddingBottom: 20, gap: 20 },
  googleButton: {
    minHeight: 56,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DADCE0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  googleImage: { width: 22, height: 22 },
  googleLabel: { fontFamily: fonts.medium, fontSize: 16, color: '#1F1F1F' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E7E8EB' },
  dividerLabel: { fontFamily: fonts.regular, fontSize: 12, color: '#96969E' },
  forgotButton: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  forgotLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  signupButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  signupText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, textAlign: 'center', color: colors.textSecondary },
  signupLabel: { fontFamily: fonts.semibold, color: colors.primary },
});
