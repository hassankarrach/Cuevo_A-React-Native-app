import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

export default function IntroductionDoodles({ variation }: { variation: number }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 354 160" preserveAspectRatio="xMidYMin meet">
      <G fill="none" stroke="#FFE79A" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        <G transform="translate(14 14) rotate(-12 12 20)">
          <Path d="M9 0 L4 39 M27 1 L22 40 M0 13 L35 13 M-2 28 L33 28" />
        </G>
        {variation === 2
          ? <Path d="M302 9 C330 -4 351 9 338 31 C331 43 317 47 313 60 M310 43 L311 62 L330 58" />
          : <Path d="M299 10 C316 -3 347 3 341 25 C336 44 311 51 308 66 M307 47 L306 68 L327 63" />}
      </G>
    </Svg>
  </View>;
}
