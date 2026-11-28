import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

type WelcomeContentProps = {
  dark?: boolean;
  onLoginPress: () => void;
};

export default function WelcomeContent({ dark = false }: { dark?: boolean }) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={[styles.headline, dark && { color: '#FFF5EB' }]}>Your music.{'\n'}Better together.</Text>
        <Text style={[styles.subtitle, dark && { color: '#BEB3AF' }]}>
          Build shared playlists and vote for what plays next.
        </Text>
      </View>

    </View>
  );
}

export function WelcomeLogin({ onLoginPress, dark = false }: WelcomeContentProps) {
  return (
      <View style={styles.actions}>
        <Pressable onPress={onLoginPress} accessibilityRole="button" style={styles.loginButton}>
          <Text style={[styles.loginText, dark && { color: '#BEB3AF' }]}>
            Already have an account? <Text style={[styles.loginLabel, dark && { color: '#FFF5EB' }]}>Log in</Text>
          </Text>
        </Pressable>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 4,
  },
  copy: {
    alignItems: 'center',
    gap: 10,
  },
  headline: {
    fontSize: 30,
    lineHeight: 35,
    fontFamily: fonts.semibold,
    letterSpacing: -0.8,
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    maxWidth: 300,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  actions: {
    gap: 4,
  },
  loginButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loginText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  loginLabel: {
    color: colors.text,
    fontFamily: fonts.semibold,
  },
});
