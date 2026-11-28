import { useAppColors, type AppColors } from '../../theme/useAppColors';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeSkeleton from './components/HomeSkeleton';
import HomeHero from './components/HomeHero';
import HomeRooms from './components/HomeRooms';
import HomePlaylists from './components/HomePlaylists';

// Temporary loading preview; replace the timer with real data readiness later.
const HOME_LOADING_DELAY_MS = 2000;

export default function HomeScreen() {
  const colors = useAppColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), HOME_LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, []));
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <StatusBar style={colors.dark ? 'light' : 'dark'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.sections, { paddingBottom: 65 + Math.max(insets.bottom, 16) + 24 }]}>
        <View style={styles.hero}><HomeHero /></View>
        {loading ? <HomeSkeleton /> : <>
          <HomeRooms />
          <HomePlaylists />
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  hero: { marginTop: 10 },
  sections: { flexGrow: 1 },
  screen: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 20 },
});
