import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppColors } from '../theme/useAppColors';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

/** Background only: content and button shadows stay outside the clipping layer. */
export default function ModalSurface({ radius = 28, topOnly = false, solid = false }: { radius?: number; topOnly?: boolean; solid?: boolean }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  return (
    <View pointerEvents="none" accessible={false} style={[
      styles.surface,
      solid && { backgroundColor: colors.dark ? colors.surface : colors.canvas },
      { borderTopLeftRadius: radius, borderTopRightRadius: radius, borderBottomLeftRadius: topOnly ? 0 : radius, borderBottomRightRadius: topOnly ? 0 : radius },
    ]}>
      {!solid && <><BlurView intensity={50} tint={colors.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} /></>}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  surface: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  // Native Modal uses a separate Android window, without an in-window blur target.
  tint: { backgroundColor: Platform.OS === 'android' ? 'rgba(255,252,248,0.94)' : 'rgba(255,252,248,0.96)' },
});
