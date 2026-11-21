import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

export default function WelcomeBrand() {
  return (
      <View style={styles.brand} accessibilityLabel="Cuevo">
        <Image
          source={require('../../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessible={false}
        />
        <Text style={styles.brandName}>Cuevo</Text>
      </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  logo: {
    width: 64,
    height: 56,
  },
  brandName: {
    fontSize: 30,
    fontFamily: fonts.brand,
    letterSpacing: -1,
    color: colors.text,
  },
});
