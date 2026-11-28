import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppColors } from '../theme/useAppColors';
import Svg, { Path } from 'react-native-svg';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const verifiedSeal = 'M50.00 2.00 C55.10 2.00 59.65 10.70 65.31 13.04 C70.96 15.39 80.33 12.45 83.94 16.06 C87.55 19.67 84.61 29.04 86.96 34.69 C89.30 40.35 98.00 44.90 98.00 50.00 C98.00 55.10 89.30 59.65 86.96 65.31 C84.61 70.96 87.55 80.33 83.94 83.94 C80.33 87.55 70.96 84.61 65.31 86.96 C59.65 89.30 55.10 98.00 50.00 98.00 C44.90 98.00 40.35 89.30 34.69 86.96 C29.04 84.61 19.67 87.55 16.06 83.94 C12.45 80.33 15.39 70.96 13.04 65.31 C10.70 59.65 2.00 55.10 2.00 50.00 C2.00 44.90 10.70 40.35 13.04 34.69 C15.39 29.04 12.45 19.67 16.06 16.06 C19.67 12.45 29.04 15.39 34.69 13.04 C40.35 10.70 44.90 2.00 50.00 2.00 Z';

export type AccountStatus = { verified?: boolean; subscriptionActive?: boolean };

export default function AccountBadges({ verified, subscriptionActive, size = 18 }: AccountStatus & { size?: number }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  if (!verified && !subscriptionActive) return null;
  return <View style={styles.badges}>
    {verified && <View accessible accessibilityLabel="Verified" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
        <Path d={verifiedSeal} fill={colors.primary} />
        <Path d="M29 50 L44 65 L72 36" fill="none" stroke="#FFFFFF" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>}
    {subscriptionActive && <View accessible accessibilityLabel="Cuevo Plus subscriber" style={[styles.plus, { minHeight: size, borderRadius: size * 0.22 }]}>
      <Image source={require('../../assets/badges/cuevo-plus.png')} resizeMode="contain" style={{ width: size * 0.8, height: size * 0.8, tintColor: '#FFF2DA' }} accessible={false} />
      <Text style={[styles.plusLabel, { fontSize: size * 0.5, lineHeight: size * 0.72 }]}>PLUS</Text>
    </View>}
  </View>;
}

const baseStyles = StyleSheet.create({
  badges: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  plus: { flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 1, backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary },
  plusLabel: { fontFamily: fonts.bold, letterSpacing: 0.5, color: '#FFFFFF' },
});
