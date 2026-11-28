import { StyleSheet, View } from 'react-native';

export default function WelcomeBackground() {
  return (
    <View style={styles.background} pointerEvents="none" accessible={false}>
      <View style={styles.topGlow}>
        <View style={[StyleSheet.absoluteFill, styles.sweep]} />
        <View style={[StyleSheet.absoluteFill, styles.accent]} />
        <View style={[StyleSheet.absoluteFill, styles.whiteFade]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    overflow: 'hidden',
  },
  // Offset ellipses create a soft diagonal sweep with an airy white center.
  sweep: {
    backgroundImage: 'radial-gradient(ellipse farthest-corner at -12% -30%, rgba(255,77,36,0.6) 0%, rgba(255,77,36,0.28) 32%, rgba(255,77,36,0.07) 55%, rgba(255,77,36,0) 78%)',
  },
  accent: {
    backgroundImage: 'radial-gradient(ellipse farthest-corner at 110% -65%, rgba(255,77,36,0.36) 0%, rgba(255,77,36,0.12) 32%, rgba(255,77,36,0) 67%)',
  },
  whiteFade: {
    backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0.8) 70%, #FFFFFF 92%, #FFFFFF 100%)',
  },
});
