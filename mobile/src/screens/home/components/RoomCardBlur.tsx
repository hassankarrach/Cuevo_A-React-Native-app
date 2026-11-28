import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, LinearGradient, Path, Stop } from 'react-native-svg';

/** A blurred ribbon of color, rendered behind the card's sharp content. */
export default function RoomCardBlur({ colors }: { colors: readonly [string, string, string] }) {
  const styles = useThemedStyles(baseStyles);

  const id = useId().replace(/:/g, '');
  const gradient = `roomTint${id}`;
  const blur = `roomBlur${id}`;

  return (
    <View pointerEvents="none" accessible={false} style={styles.background}>
      <Svg width="100%" height="100%" viewBox="0 0 164 104" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradient} x1="15%" y1="0%" x2="85%" y2="100%">
            <Stop offset="0" stopColor={colors[0]} stopOpacity="0.65" />
            <Stop offset="0.5" stopColor={colors[1]} stopOpacity="0.65" />
            <Stop offset="1" stopColor={colors[2]} stopOpacity="0.15" />
          </LinearGradient>
          <Filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation="9" />
          </Filter>
        </Defs>
        <Path
          transform="translate(24 15)"
          d="M32 4 C17 28 27 42 62 43 C94 43 130 43 134 65 C138 80 127 93 116 97 L99 87 C112 68 102 61 78 59 C42 57 12 54 16 29 C17 19 22 9 25 4 Z"
          fill={`url(#${gradient})`}
          filter={`url(#${blur})`}
        />
      </Svg>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
});
