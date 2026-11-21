import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

/** Background only: content and button shadows stay outside the clipping layer. */
export default function ModalSurface({ radius = 28, topOnly = false }: { radius?: number; topOnly?: boolean }) {
  return (
    <View pointerEvents="none" accessible={false} style={[
      styles.surface,
      { borderTopLeftRadius: radius, borderTopRightRadius: radius, borderBottomLeftRadius: topOnly ? 0 : radius, borderBottomRightRadius: topOnly ? 0 : radius },
    ]}>
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  // Native Modal uses a separate Android window, without an in-window blur target.
  tint: { backgroundColor: Platform.OS === 'android' ? 'rgba(255,252,248,0.94)' : 'rgba(255,252,248,0.96)' },
});
