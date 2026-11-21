import NativeMaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import type { ComponentType, ReactElement } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

// The library's legacy NativeMethods class declaration is incompatible with
// RN 0.88's generated types. Its runtime component accepts these documented props.
const MaskedView = NativeMaskedView as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

export default function IllustrationEdgeBlur() {
  if (Platform.OS !== 'ios') return null;

  return (
    <MaskedView
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      maskElement={<View style={styles.edgeMask} />}
    >
      <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  edgeMask: {
    flex: 1,
    backgroundImage:
      'linear-gradient(to right, black 0%, rgba(0, 0, 0, 0.6) 5%, transparent 17%, transparent 83%, rgba(0, 0, 0, 0.6) 95%, black 100%)',
  },
});
