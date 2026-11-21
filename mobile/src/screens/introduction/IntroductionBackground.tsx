import { StyleSheet, View } from 'react-native';

const rayAngles = [-64, -42, -20, 2, 24, 46, 68];

export default function IntroductionBackground() {
  return (
    <View pointerEvents="none" accessible={false} style={styles.background}>
      <View style={styles.topWarmth} />
      <View style={styles.rays}>
        {rayAngles.map((angle) => <View key={angle} style={[styles.ray, { transform: [{ rotate: `${angle}deg` }] }]} />)}
      </View>
      <View style={styles.bottomGlow} />
      <View style={styles.leftGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, backgroundColor: '#FF4D24', overflow: 'hidden' },
  topWarmth: {
    ...StyleSheet.absoluteFill,
    backgroundImage: 'linear-gradient(to bottom, rgba(238, 66, 12, 0.5) 0%, rgba(255, 100, 31, 0) 60%)',
  },
  rays: { position: 'absolute', width: '100%', height: '65%', top: '-18%', left: 0 },
  ray: {
    position: 'absolute', left: '43%', top: '-20%', width: '14%', height: '135%',
    transformOrigin: '50% 0%',
    backgroundImage: 'linear-gradient(to bottom, rgba(255, 207, 139, 0) 0%, rgba(255, 207, 139, 0.09) 35%, rgba(255, 207, 139, 0) 100%)',
  },
  bottomGlow: {
    ...StyleSheet.absoluteFill,
    backgroundImage: 'radial-gradient(ellipse farthest-corner at 55% 110%, rgba(255, 232, 112, 1) 0%, rgba(255, 212, 79, 0.9) 24%, rgba(255, 183, 50, 0.5) 48%, rgba(255, 161, 35, 0) 76%)',
  },
  leftGlow: {
    ...StyleSheet.absoluteFill,
    backgroundImage: 'radial-gradient(ellipse farthest-corner at -10% 75%, rgba(255, 213, 89, 0.35) 0%, rgba(255, 185, 61, 0) 60%)',
  },
});
