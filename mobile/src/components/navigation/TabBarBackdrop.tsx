import NativeMaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import type { ComponentRef, ComponentType, ReactElement, RefObject } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

// Adapter for masked-view's legacy native component declaration.
const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

type TabBarBackdropProps = { height: number; placement?: 'top' | 'bottom'; top?: number; blur?: boolean; blurTarget: RefObject<ComponentRef<typeof View> | null> };

export default function TabBarBackdrop({ height, blurTarget, placement = 'bottom', top = 0, blur = true }: TabBarBackdropProps) {
  return (
    <View pointerEvents="none" accessible={false} style={[styles.backdrop, { height }, placement === 'top' ? { top } : { bottom: 0 }]}>
      {blur && <MaskedView style={StyleSheet.absoluteFill} maskElement={<View style={[styles.mask, placement === 'top' && styles.topMask]} />}>
        <BlurView blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      </MaskedView>}
      <View style={[styles.warmFade, placement === 'top' && styles.topFade]} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0 },
  topMask: { backgroundImage: 'linear-gradient(to bottom, black 0%, black 25%, rgba(0,0,0,0.3) 70%, transparent 100%)' },
  topFade: { backgroundImage: 'linear-gradient(to bottom, rgba(255,252,248,0.8) 0%, rgba(255,252,248,0.3) 55%, rgba(255,252,248,0) 100%)' },
  mask: { flex: 1, backgroundImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, black 75%, black 100%)' },
  warmFade: { ...StyleSheet.absoluteFill, backgroundImage: 'linear-gradient(to bottom, rgba(255,252,248,0) 0%, rgba(255,252,248,0.3) 45%, rgba(255,252,248,0.8) 100%)' },
});
