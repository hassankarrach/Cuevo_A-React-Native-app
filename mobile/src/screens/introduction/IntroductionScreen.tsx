import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '../../theme/fonts';
import IntroductionBackground from './IntroductionBackground';
import IntroductionDoodles from './IntroductionDoodles';

const slides = [
  { eyebrow: 'LISTEN TOGETHER', title: 'Good music.', subtitle: 'Better\ncompany.', description: 'A space to discover, share, and enjoy music together.', image: require('../../../assets/illustrations/cuevo-intro-discover.png') },
  { eyebrow: 'CREATE TOGETHER', title: 'Your favorites.', subtitle: 'One shared\nplaylist.', description: 'Bring your songs together. Build a playlist with your people.', image: require('../../../assets/illustrations/cuevo-intro-playlists.png') },
  { eyebrow: 'CHOOSE TOGETHER', title: 'Pick the next track.', subtitle: 'Every vote\ncounts.', description: 'Join a room, suggest a song, and vote for what plays next.', image: require('../../../assets/illustrations/cuevo-intro-vote.png') },
];

export default function IntroductionScreen() {
  const [step, setStep] = useState(0);
  const { height, width } = useWindowDimensions();
  const slide = slides[step];
  const compact = width < 370 || height < 740;
  const artworkWidth = width * 1.25;
  return <View style={styles.screen}>
    <IntroductionBackground />
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden style={styles.illustrationLayer}>
      <Image key={step} source={slide.image} resizeMode="contain" style={[styles.illustration, { width: artworkWidth, height: artworkWidth * 2, left: (width - artworkWidth) / 2 - artworkWidth * 0.12, top: 0, transform: [{ translateY: height * (compact ? 0.40 : 0.34) }] }]} />
    </View>
    <SafeAreaView style={styles.content}>
      <View style={styles.progress} accessibilityLabel={`Welcome page ${step + 1} of ${slides.length}`}>
        {slides.map((_, index) => <View key={index} style={[styles.progressTrack, index <= step && styles.progressComplete]} />)}
      </View>
      <Pressable onPress={() => step > 0 ? setStep(step - 1) : router.canGoBack() ? router.back() : router.replace('/')} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#FFF8EC" accessible={false} />
      </Pressable>
      <ScrollView key={step} style={styles.scroll} contentContainerStyle={[styles.slide, compact && styles.compactSlide]} showsVerticalScrollIndicator={false}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
          <View accessible accessibilityRole="header" accessibilityLabel={`${slide.title} ${slide.subtitle}`} style={styles.headlineGroup}>
            <IntroductionDoodles variation={step} />
            <Text accessible={false} style={[styles.handwriting, compact && styles.compactHandwriting]}>{slide.title}</Text>
            <Text accessible={false} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.heading, compact && styles.compactHeading]}>{slide.subtitle.toUpperCase()}</Text>
          </View>
          <Text style={styles.description}>{slide.description}</Text>
        </View>
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => step < slides.length - 1 ? setStep(step + 1) : router.replace('/home')} style={styles.next}>
        <Text style={styles.nextLabel}>{step === slides.length - 1 ? 'Explore Cuevo' : 'Next'}</Text>
        <Ionicons name="arrow-forward" size={22} color="#231B18" accessible={false} />
      </Pressable>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FF4D24', overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 12 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,248,236,0.3)', borderRadius: 2 },
  progressComplete: { backgroundColor: '#FFF8EC' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  scroll: { flex: 1 },
  slide: { flexGrow: 1, paddingTop: 12, paddingBottom: 24 },
  compactSlide: { paddingTop: 4 },
  copy: { alignItems: 'center', gap: 10 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2, color: '#FFF8EC' },
  headlineGroup: { width: '100%', alignItems: 'center', paddingTop: 10, paddingBottom: 15 },
  heading: { fontFamily: fonts.black, fontSize: 43, lineHeight: 45, letterSpacing: -1.5, textAlign: 'center', color: '#FFF8EC', alignSelf: 'stretch' },
  handwriting: { fontFamily: fonts.handwriting, fontSize: 35, lineHeight: 44, color: '#231B18', textAlign: 'center', marginBottom: -7, zIndex: 1 },
  compactHeading: { fontSize: 36, lineHeight: 38, letterSpacing: -1.1 },
  compactHandwriting: { fontSize: 30, lineHeight: 38 },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', color: '#3C241C', maxWidth: 300 },
  illustrationLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  illustration: { position: 'absolute' },
  next: { minHeight: 58, borderRadius: 15, backgroundColor: '#FFF8EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 },
  nextLabel: { fontFamily: fonts.semibold, fontSize: 17, color: '#231B18' },
});
