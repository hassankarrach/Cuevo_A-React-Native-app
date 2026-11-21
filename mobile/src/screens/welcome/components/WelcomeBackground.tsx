import { StyleSheet, View } from 'react-native';

import { colors } from '../../../theme/colors';

export default function WelcomeBackground() {
  return (
    <View style={styles.background} pointerEvents="none" accessible={false}>
      <View style={[StyleSheet.absoluteFill, styles.peachGlow]} />
      <View style={[StyleSheet.absoluteFill, styles.coralGlow]} />
      <View style={[StyleSheet.absoluteFill, styles.lavenderGlow]} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
  },
  peachGlow: {
    backgroundImage:
      'radial-gradient(ellipse farthest-corner at 0% 15%, rgba(255, 181, 133, 0.65) 0%, rgba(255, 210, 179, 0.3) 35%, rgba(255, 210, 179, 0) 70%)',
  },
  coralGlow: {
    backgroundImage:
      'radial-gradient(ellipse farthest-corner at 100% 40%, rgba(255, 125, 111, 0.35) 0%, rgba(255, 183, 173, 0.15) 30%, rgba(255, 183, 173, 0) 65%)',
  },
  lavenderGlow: {
    backgroundImage:
      'radial-gradient(ellipse farthest-corner at 90% 100%, rgba(178, 157, 240, 0.45) 0%, rgba(210, 196, 250, 0.2) 30%, rgba(210, 196, 250, 0) 65%)',
  },
});
