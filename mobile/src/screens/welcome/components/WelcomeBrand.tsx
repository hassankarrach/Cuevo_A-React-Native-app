import { Image, StyleSheet, View } from 'react-native';

export default function WelcomeBrand() {
  return (
    <View style={styles.brand} accessibilityLabel="Cuevo" accessible>
      <Image
        source={require('../../../../assets/brand/cuevo-flow-wordmark.png')}
        style={styles.logo}
        resizeMode="contain"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    height: 39.26,
  },
  logo: {
    // Account for the transparent margins in the original generated artwork.
    position: 'absolute',
    width: 200,
    height: 66.67,
  },
});
