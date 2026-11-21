import NativeMaskedView from '@react-native-masked-view/masked-view';
import type { ComponentType, ReactElement } from 'react';
import { Image, StyleSheet, View, type ViewProps } from 'react-native';

// Match the native masked-view adapter used by the existing welcome effects.
const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

export default function WelcomeCharacters() {
  return <View pointerEvents="none" accessible={false} style={styles.overlay}>
    <MaskedView style={styles.artwork} maskElement={<View style={styles.fade} />}>
      <Image source={require('../../../../assets/illustrations/cuevo-listening-together.png')} resizeMode="contain" style={styles.image} accessible={false} />
    </MaskedView>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, bottom: -32, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 12 },
  // Match the PNG bounds so the fade follows the photo rather than contain-mode empty space.
  artwork: { width: '100%', aspectRatio: 1225 / 1284 },
  image: { width: '100%', height: '100%' },
  fade: { flex: 1, backgroundImage: 'linear-gradient(to bottom, black 0%, black 45%, rgba(0,0,0,0.8) 58%, rgba(0,0,0,0.35) 73%, transparent 88%, transparent 100%)' },
});
