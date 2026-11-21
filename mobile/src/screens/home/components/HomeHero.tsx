import NativeMaskedView from '@react-native-masked-view/masked-view';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState, type ComponentType, type ReactElement } from 'react';
import { AccessibilityInfo, AppState, Image, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

const homeBannerPath = 'M0 65 Q0 59 5 54 L54 5 Q59 0 67 0 H334 Q360 0 360 26 V145 Q360 164 340 164 H291 Q283 164 277 170 L264 183 Q258 190 248 190 H26 Q0 190 0 164 Z';

const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;
const video = require('../../../../assets/videos/cuevo-home-collaboration.mp4');
const poster = require('../../../../assets/videos/cuevo-home-collaboration-poster.jpg');

export default function HomeHero() {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [hasFrame, setHasFrame] = useState(false);
  const player = useVideoPlayer(video, instance => {
    instance.loop = true;
    instance.muted = true;
    instance.audioMixingMode = 'mixWithOthers';
  });

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    const updatePlayback = () => {
      if (!reduceMotion && AppState.currentState === 'active') player.play();
      else player.pause();
    };
    updatePlayback();
    const subscription = AppState.addEventListener('change', updatePlayback);
    return () => { subscription.remove(); player.pause(); };
  }, [player, reduceMotion]));

  return <View style={styles.banner}>
    <MaskedView pointerEvents="none" accessible={false} accessibilityElementsHidden style={StyleSheet.absoluteFill}
      maskElement={<Svg width="100%" height="100%" viewBox="0 0 360 190" preserveAspectRatio="none"><Path d={homeBannerPath} fill="#000000" /></Svg>}>
      <View style={styles.media}>
        <Image source={poster} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <VideoView player={player} nativeControls={false} contentFit="cover" surfaceType="textureView"
          onFirstFrameRender={() => setHasFrame(true)} style={[StyleSheet.absoluteFill, { opacity: hasFrame && !reduceMotion ? 1 : 0 }]} />
        <View style={[StyleSheet.absoluteFill, styles.orangeWash]} />
        <View style={[StyleSheet.absoluteFill, styles.orangeMesh]} />
        <View style={[StyleSheet.absoluteFill, styles.peachMesh]} />
        <View style={[StyleSheet.absoluteFill, styles.coralMesh]} />
      </View>
    </MaskedView>
    <View style={styles.content}>
      <View style={styles.planLabel}>
        <Image source={require('../../../../assets/badges/cuevo-plus.png')} style={styles.sparkle} accessible={false} />
        <Text style={styles.planName}>CUEVO PLUS</Text>
      </View>
      <Text accessibilityRole="header" style={styles.heading}>Make room{'\n'}for more music.</Text>
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
const styles = StyleSheet.create({
  banner: { minHeight: 224 },
  media: { flex: 1, backgroundColor: colors.primary },
  orangeWash: { backgroundColor: 'rgba(255,77,36,0.76)' },
  orangeMesh: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 15% 20%, rgba(255,115,53,0.55) 0%, rgba(255,115,53,0.2) 45%, rgba(255,115,53,0) 80%)' },
  peachMesh: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 85% 10%, rgba(255,202,157,0.62) 0%, rgba(255,170,110,0.24) 42%, rgba(255,170,110,0) 78%)' },
  coralMesh: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 65% 110%, rgba(255,99,68,0.6) 0%, rgba(255,99,68,0.22) 48%, rgba(255,99,68,0) 85%)' },
  content: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },
  planLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 36 },
  sparkle: { width: 17, height: 17, tintColor: '#FFF2DA' },
  planName: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.6, color: '#FFF2DA' },
  heading: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 33, letterSpacing: -1, color: '#FFF8EC', marginTop: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  cta: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 14, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  ctaPressed: { opacity: 0.8 },
  ctaLabel: { fontFamily: fonts.semibold, fontSize: 12, color: '#9A351D' },
  price: { fontFamily: fonts.semibold, fontSize: 14, color: '#FFF8EC' },
});
