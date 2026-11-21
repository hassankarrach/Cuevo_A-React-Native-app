import MaskedViewNative from '@react-native-masked-view/masked-view';
import type { ComponentType, ReactElement } from 'react';
import { Image, StyleSheet, View, type ViewProps } from 'react-native';

// Adapt the library's legacy class declaration to RN 0.88's generated types.
const MaskedView = MaskedViewNative as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

const ribbon = require('../../../../assets/decorations/login-ribbon-gray.png');

export default function LoginDecoration() {
  return (
    <View pointerEvents="none" accessible={false} style={styles.ribbon}>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={<View style={[styles.mask, styles.sharpMask]} />}
      >
        <Image source={ribbon} resizeMode="contain" accessible={false} style={styles.image} />
      </MaskedView>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={<View style={[styles.mask, styles.blurMask]} />}
      >
        <Image
          source={ribbon}
          resizeMode="contain"
          blurRadius={12}
          accessible={false}
          style={styles.image}
        />
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    position: 'absolute',
    width: '115%',
    aspectRatio: 480 / 430,
    right: '-35%',
    bottom: -70,
    opacity: 0.3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  mask: { flex: 1 },
  sharpMask: {
    backgroundImage:
      'linear-gradient(to bottom, transparent 0%, transparent 8%, black 65%, black 100%)',
  },
  blurMask: {
    backgroundImage:
      'linear-gradient(to bottom, black 0%, black 8%, transparent 65%, transparent 100%)',
  },
});
