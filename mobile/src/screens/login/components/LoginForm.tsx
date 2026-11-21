import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../../components/PrimaryButton';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';
import LoginFields from './LoginFields';

export default function LoginForm({ onSignUp, onForgotPassword }: { onSignUp: () => void; onForgotPassword: () => void }) {
  return (
    <View style={styles.form}>
      <View>
        <LoginFields />
        <Pressable onPress={onForgotPassword} accessibilityRole="button" style={styles.forgotButton}>
          <Text style={styles.forgotLabel}>Forgot password?</Text>
        </Pressable>
      </View>

      <PrimaryButton label="Log in" disabled />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Auth actions remain visual previews until services are connected. */}
      <Pressable disabled accessibilityRole="button" accessibilityLabel="Sign in with Google" style={styles.googleButton}>
        <Image
          source={require('../../../../assets/brand/google-g.png')}
          resizeMode="contain"
          accessible={false}
          style={styles.googleImage}
        />
        <Text style={styles.googleLabel}>Sign in with Google</Text>
      </Pressable>


      <Pressable onPress={onSignUp} accessibilityRole="button" style={styles.signupButton}>
        <Text style={styles.signupText}>
          New to Cuevo? <Text style={styles.signupLabel}>Create an account</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
