import { useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import LoginFields from '../login/components/LoginFields';
import { emailError, passwordError } from './authValidation';

export default function SignUpForm({ onLogin, onContinue, initialEmail = '' }: { onLogin: () => void; onContinue: (email: string) => void; initialEmail?: string }) {
  const [credentials, setCredentials] = useState({ email: initialEmail, password: '' });
  const [error, setError] = useState('');
  function continueSignup() {
    const invalid = emailError(credentials.email) || passwordError(credentials.password);
    setError(invalid);
    if (!invalid) { Keyboard.dismiss(); onContinue(credentials.email.trim()); }
  }
  return (
    <View style={styles.form}>
      <View>
        <LoginFields newAccount initialEmail={initialEmail} onChange={value => { setCredentials(value); setError(''); }} />

      </View>

      <View style={{ gap: 12 }}>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<PrimaryButton label="Continue" onPress={continueSignup} /></View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Auth actions remain visual previews until services are connected. */}
      <Pressable disabled accessibilityRole="button" accessibilityLabel="Continue with Google" style={styles.googleButton}>
        <Image
          source={require('../../../assets/brand/google-g.png')}
          resizeMode="contain"
          accessible={false}
          style={styles.googleImage}
        />
        <Text style={styles.googleLabel}>Continue with Google</Text>
      </Pressable>


      <Pressable onPress={onLogin} accessibilityRole="button" style={styles.signupButton}>
        <Text style={styles.signupText}>
          Already have an account? <Text style={styles.signupLabel}>Log in</Text>
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
