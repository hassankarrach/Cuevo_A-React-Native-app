import { useThemedStyles } from '../../../theme/useThemedStyles';
import NativeMaskedView from '@react-native-masked-view/masked-view';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentType, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

const homeBannerPath = 'M0 65 Q0 59 5 54 L54 5 Q59 0 67 0 H334 Q360 0 360 26 V145 Q360 164 340 164 H291 Q283 164 277 170 L264 183 Q258 190 248 190 H26 Q0 190 0 164 Z';

const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;
const artwork = require('../../../../assets/illustrations/cuevo-plus-duo.png');

// Artwork controls: width sets the size; negative right/bottom moves it out of the card.
const artworkLayout = {
  width: '55%',
  right: -16,
  bottom: -3,
  aspectRatio: 1218 / 1291,
} as const;

export default function HomeHero() {
  const styles = useThemedStyles(baseStyles);

  return <View style={styles.banner}>
    <MaskedView pointerEvents="none" accessible={false} accessibilityElementsHidden style={StyleSheet.absoluteFill}
      maskElement={<Svg width="100%" height="100%" viewBox="0 0 360 190" preserveAspectRatio="none"><Path d={homeBannerPath} fill="#000000" /></Svg>}>
      <View style={styles.media}>
        <View style={[StyleSheet.absoluteFill, styles.orangeMesh]} />
        <View style={[StyleSheet.absoluteFill, styles.peachMesh]} />
        <View style={[StyleSheet.absoluteFill, styles.coralMesh]} />
      </View>
    </MaskedView>
    <View pointerEvents="none" accessible={false} style={styles.artwork}>
      <Image source={artwork} resizeMode="contain" accessible={false} style={styles.artworkImage} />
    </View>
    <View style={styles.content}>
      <View style={styles.planLabel}>
        <Image source={require('../../../../assets/badges/cuevo-plus.png')} style={styles.sparkle} accessible={false} />
        <Text style={styles.planName}>CUEVO PLUS</Text>
      </View>
      <View style={styles.headlineArea}>
        <Text accessibilityRole="header" style={styles.heading}>Make room{'\n'}for more music.</Text>
      </View>
      <View style={styles.actionRow}>
        <Pressable onPress={() => router.push('/subscription')} accessibilityRole="button" accessibilityLabel="Explore Cuevo Plus, 99 DH" style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaLabel}>Explore Plus</Text>
          <Ionicons name="arrow-forward" size={17} color="#9A351D" accessible={false} />
        </Pressable>
        <Text style={styles.price}>99 DH</Text>
      </View>
    </View>
  </View>;
}
const baseStyles = StyleSheet.create({
  banner: { minHeight: 224, overflow: 'visible' },
  media: { flex: 1, backgroundColor: colors.primary, isolation: 'isolate' },
  artwork: { position: 'absolute', zIndex: 1, ...artworkLayout },
  artworkImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  orangeMesh: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 15% 20%, rgba(255,115,53,0.55) 0%, rgba(255,115,53,0.2) 45%, rgba(255,115,53,0) 80%)' },
  peachMesh: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 85% 10%, rgba(255,202,157,0.62) 0%, rgba(255,170,110,0.24) 42%, rgba(255,170,110,0) 78%)' },
  coralMesh: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 65% 110%, rgba(255,99,68,0.6) 0%, rgba(255,99,68,0.22) 48%, rgba(255,99,68,0) 85%)' },
  content: { zIndex: 2, minHeight: 224, width: '62%', paddingLeft: 8, paddingRight: 0, paddingTop: 15, paddingBottom: 8 },
  planLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 50 },
  sparkle: { width: 17, height: 17, tintColor: '#FFF2DA' },
  planName: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.6, color: '#FFF2DA' },
  headlineArea: { flex: 1, justifyContent: 'center', paddingVertical: 12 },
  heading: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 30, letterSpacing: -1, color: '#FFF8EC' },
  actionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  cta: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderTopLeftRadius: 5, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  ctaPressed: { opacity: 0.8 },
  ctaLabel: { fontFamily: fonts.semibold, fontSize: 12, color: '#9A351D' },
  price: { fontFamily: fonts.semibold, fontSize: 14, color: '#FFF8EC' },
});
