import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function WelcomeCharacters() {
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const aspectRatio = 1199 / 1312;
  const width = Math.max(0, bounds.width);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={styles.overlay}
      onLayout={({ nativeEvent: { layout } }) => setBounds({ width: layout.width, height: layout.height })}
    >
      <Image
        source={require('../../../../assets/illustrations/cuevo-welcome-art.png')}
        resizeMode="contain"
        style={{ width, height: width / aspectRatio }}
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
