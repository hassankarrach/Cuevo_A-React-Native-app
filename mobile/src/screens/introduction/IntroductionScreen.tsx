import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '../../theme/fonts';
import IntroductionVideo from './IntroductionVideo';

const slides = [
  { eyebrow: 'LISTEN TOGETHER', title: 'Good music.', subtitle: 'Better\ncompany.', description: 'A space to discover, share, and enjoy music together.', video: require('../../../assets/videos/cuevo-intro-discover-loop-pingpong.mp4'), image: require('../../../assets/illustrations/cuevo-intro-discover-poster.png') },
  { eyebrow: 'CREATE TOGETHER', title: 'Your favorites.', subtitle: 'One shared\nplaylist.', description: 'Bring your songs together. Build a playlist with your people.', video: require('../../../assets/videos/cuevo-intro-playlists-loop-pingpong.mp4'), image: require('../../../assets/illustrations/cuevo-intro-playlists-poster.png') },
  { eyebrow: 'CHOOSE TOGETHER', title: 'Pick the next track.', subtitle: 'Every vote\ncounts.', description: 'Join a room, suggest a song, and vote for what plays next.', video: require('../../../assets/videos/cuevo-intro-vote-loop-pingpong.mp4'), image: require('../../../assets/illustrations/cuevo-intro-vote-poster.png') },
];

export default function IntroductionScreen() {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  return <View style={styles.screen}>
    <IntroductionVideo key={step} source={slide.video} poster={slide.image} />
    <SafeAreaView style={styles.content}>
      <View style={styles.progress} accessibilityLabel={`Welcome page ${step + 1} of ${slides.length}`}>
        {slides.map((_, index) => <View key={index} style={[styles.progressTrack, index <= step && styles.progressComplete]} />)}
      </View>
      <Pressable onPress={() => step > 0 ? setStep(step - 1) : router.canGoBack() ? router.back() : router.replace('/')} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#FFF8EC" accessible={false} />
      </Pressable>
      <View style={styles.scroll} accessible accessibilityRole="header" accessibilityLabel={`${slide.eyebrow}. ${slide.title} ${slide.subtitle.replace('\n', ' ')} ${slide.description}`} />
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
  next: { minHeight: 58, borderRadius: 15, backgroundColor: '#FFF8EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 },
  nextLabel: { fontFamily: fonts.semibold, fontSize: 17, color: '#231B18' },
});
