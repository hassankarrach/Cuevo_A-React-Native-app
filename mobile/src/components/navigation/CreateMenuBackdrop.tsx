import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import NativeMaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import type { ComponentRef, ComponentType, ReactElement, RefObject } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

export default function CreateMenuBackdrop({ blurTarget }: { blurTarget: RefObject<ComponentRef<typeof View> | null> }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <MaskedView style={StyleSheet.absoluteFill} maskElement={<View style={styles.mask} />}>
        <BlurView blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={28} tint={colors.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </MaskedView>
      <View style={styles.shade} />
      <View style={styles.peachGlow} />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  mask: { flex: 1, backgroundImage: 'radial-gradient(ellipse farthest-corner at 110% 105%, black 0%, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.55) 48%, transparent 78%)' },
  shade: { ...StyleSheet.absoluteFill, backgroundImage: 'radial-gradient(ellipse farthest-corner at 110% 105%, rgba(255,77,36,0.97) 0%, rgba(255,91,43,0.88) 25%, rgba(255,121,64,0.5) 48%, rgba(255,149,88,0) 78%)' },
  peachGlow: { ...StyleSheet.absoluteFill, backgroundImage: 'radial-gradient(ellipse farthest-corner at 105% 65%, rgba(255,182,115,0.28) 0%, rgba(255,160,97,0.1) 30%, rgba(255,160,97,0) 65%)' },
});
