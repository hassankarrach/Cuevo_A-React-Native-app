import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { useMockRooms } from '../../state/MockRoomsContext';
import PrimaryButton from '../../components/PrimaryButton';
import { NearbyMap } from './components/NearbyMap';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function NearbyScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const screenRef = useRef<ComponentRef<typeof View>>(null);
  const radarRef = useRef<ComponentRef<typeof View>>(null);
  const [mapAnchor, setMapAnchor] = useState<{ x: number; y: number }>();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.69, 310);
  const [phase, setPhase] = useState<'searching' | 'paused' | 'results'>('searching');
  const searching = phase === 'searching';
  const { rooms } = useMockRooms();
  const nearbyRooms = [
    { id: 'kitchen-disco', name: 'Kitchen Disco' },
    { id: 'late-nights', name: 'Late Nights' },
    { id: 'on-repeat', name: 'On Repeat' },
  ].filter(({ id }) => rooms[id] && rooms[id].visibility !== 'private' && !rooms[id].playback.ended);

  // Simulated discovery: cancel on Stop, blur or unmount; rescan starts a fresh 5s.
  useFocusEffect(useCallback(() => {
    if (!searching) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      if (AppState.currentState === 'active') timer = setTimeout(() => setPhase('results'), 5000);
    };
    update();
    const subscription = AppState.addEventListener('change', update);
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [searching]));
  const [reduceMotion, setReduceMotion] = useState(true);
  const [breath] = useState(() => new Animated.Value(0));
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    const animation = Animated.parallel([
      Animated.loop(Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
        Animated.timing(breath, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      ])),
      Animated.loop(Animated.timing(turn, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true, isInteraction: false })),
    ]);
    function update() {
      animation.stop();
      breath.setValue(0);
      turn.setValue(0);
      if (searching && !reduceMotion && AppState.currentState === 'active') animation.start();
    }
    update();
    const subscription = AppState.addEventListener('change', update);
    return () => { subscription.remove(); animation.stop(); };
  }, [breath, turn, searching, reduceMotion]));

  return <View ref={screenRef} style={styles.screen}>
    <StatusBar style={colors.dark ? 'light' : 'dark'} />
    <View style={styles.map} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <NearbyMap anchor={mapAnchor} />
      <View style={styles.mapWash} />
      <View style={styles.topFade} />
      <View style={styles.bottomFade} />
      <View style={[StyleSheet.absoluteFill, styles.meshPeach, colors.dark && { opacity: 0.18 }]} />
      <View style={[StyleSheet.absoluteFill, styles.meshOrange, colors.dark && { opacity: 0.18 }]} />
      <View style={[StyleSheet.absoluteFill, styles.meshCream, colors.dark && { opacity: 0.18 }]} />
    </View>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to rooms" onPress={() => router.canGoBack() ? router.back() : router.replace('/rooms')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Nearby rooms</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.center}>
          <View ref={radarRef} onLayout={() => {
            if (screenRef.current) radarRef.current?.measureLayout(screenRef.current, (x, y, w, h) => setMapAnchor({ x: x + w / 2, y: y + h / 2 }));
          }} style={[styles.radarStage, { width: size, height: size }]} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.radarTint} />
            {[1, 0.68, 0.36].map(scale => <View key={scale} style={[styles.ring, { width: size * scale, height: size * scale, borderRadius: size }]} />)}
            <Animated.View style={[styles.pulse, { opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.35] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]} />
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: searching ? 1 : 0, transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
              <Svg width="100%" height="100%" viewBox="0 0 300 300">
                <Defs><SvgGradient id="sweep" x1="0" y1="1" x2="1" y2="0"><Stop offset="0" stopColor="#FF8E45" stopOpacity="0" /><Stop offset="1" stopColor="#FF8E45" stopOpacity="0.42" /></SvgGradient></Defs>
                <Path d="M150 150 L150 1 A149 149 0 0 1 299 150 Z" fill="url(#sweep)" />
                <Path d="M150 150 L299 150" stroke="#F3914C" strokeWidth="1" />
              </Svg>
            </Animated.View>
            <View style={styles.youHalo}><View style={styles.youDot}><Ionicons name="musical-note" size={19} color="#fff" /></View></View>
          </View>
        </View>
        <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
        <View style={styles.footer}>
          <View style={styles.discoveryPanel}>
            <View style={styles.panelHeading} accessibilityLiveRegion="polite">
              <Ionicons name={searching ? 'radio-outline' : phase === 'results' ? 'musical-notes-outline' : 'pause-outline'} size={21} color={colors.primary} accessible={false} />
              <Text accessibilityRole="header" style={styles.statusTitle}>{searching ? 'Searching nearby…' : phase === 'results' ? `${nearbyRooms.length} rooms nearby` : 'Search paused'}</Text>
              <View style={[styles.statusDot, !searching && styles.pausedDot]} />
            </View>
            <View style={styles.panelBody}>
              {phase === 'results' ? nearbyRooms.length ? nearbyRooms.map(({ id, name }) => {
                const room = rooms[id];
                const track = room.playback.tracks.find(item => item.id === room.playback.currentId);
                return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Open ${room.name ?? name}`} onPress={() => router.push({ pathname: '/room/[id]', params: { id } })} style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}>
                  <View style={styles.resultIcon}><Ionicons name="musical-note" size={20} color={colors.primary} accessible={false} /></View>
                  <View style={styles.resultCopy}>
                    <Text numberOfLines={1} style={styles.roomName}>{room.name ?? name}</Text>
                    <Text numberOfLines={1} style={styles.roomDetail}>{room.participantIds.length} listening{track ? ` · ${track.title}` : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} accessible={false} />
                </Pressable>;
              }) : <Text style={styles.emptyLabel}>No rooms nearby</Text> : <View style={styles.searchState}>
                <View style={styles.searchStateIcon}><Ionicons name={searching ? 'radio-outline' : 'pause-outline'} size={34} color={colors.primary} accessible={false} /></View>
              </View>}
            </View>
          </View>
          <View style={styles.panelButton}>
            <PrimaryButton icon={<Ionicons name={searching ? 'close' : 'radio-outline'} size={20} color="#FFFFFF" />} label={searching ? 'Stop searching' : 'Scan nearby'} onPress={() => setPhase(searching ? 'paused' : 'searching')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>;
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5F1' },
  map: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  mapWash: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,253,248,0.16)' },
  topFade: { position: 'absolute', top: 0, width: '100%', height: '45%', backgroundImage: 'linear-gradient(to bottom, #FAF9F5 20%, rgba(250,249,245,0.92) 50%, rgba(250,249,245,0))' },
  bottomFade: { position: 'absolute', bottom: 0, width: '100%', height: '40%', backgroundImage: 'linear-gradient(to top, #FAF9F5 20%, rgba(250,249,245,0.94) 50%, rgba(250,249,245,0))' },
  // Broad, overlapping radial fades create a mesh effect without a bitmap or blur.
  meshPeach: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 22% 12%, rgba(255,172,136,0.72) 0%, rgba(255,193,164,0.38) 22%, rgba(255,219,198,0) 53%)' },
  meshOrange: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 100% 78%, rgba(255,77,36,0.52) 0%, rgba(255,128,74,0.34) 16%, rgba(255,177,125,0.12) 32%, rgba(255,211,178,0) 54%)' },
  meshCream: { backgroundImage: 'radial-gradient(ellipse farthest-corner at 0% 58%, rgba(255,239,199,0.78) 0%, rgba(255,243,218,0.35) 22%, rgba(255,249,237,0) 47%)' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 21, color: colors.text },
  headerSpacer: { width: 44 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 18, maxWidth: 600, width: '100%', alignSelf: 'center' },
  center: { flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center', paddingVertical: 30 },
  radarStage: { alignItems: 'center', justifyContent: 'center' },
  radarTint: { ...StyleSheet.absoluteFill, borderRadius: 300, backgroundImage: 'radial-gradient(circle, rgba(255,201,118,0.38), rgba(255,194,112,0.13) 70%)' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(213,148,69,0.28)' },
  pulse: { ...StyleSheet.absoluteFill, borderRadius: 300, borderWidth: 1, borderColor: '#E7863F', backgroundColor: '#FFD896' },
  youHalo: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  youDot: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF', boxShadow: '0 4px 18px rgba(213,93,33,0.25)' },
  footer: { paddingTop: 12 },
  discoveryPanel: { minHeight: 286, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 44, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: '#FFFFFF', boxShadow: '0 8px 30px rgba(72,56,34,0.07)' },
  panelHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  panelBody: { minHeight: 192, justifyContent: 'center' },
  panelButton: { marginTop: -28, marginHorizontal: 16 },
  searchState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchStateIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFF1E5', alignItems: 'center', justifyContent: 'center' },
  resultRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  resultPressed: { opacity: 0.65 },
  resultIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF1E5', alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1, minWidth: 0, gap: 5 },
  roomName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  roomDetail: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  emptyLabel: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', color: colors.textSecondary },
  statusTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  pausedDot: { backgroundColor: '#B9B0A8' },
  attribution: { fontFamily: fonts.regular, fontSize: 9, color: '#716460', textAlign: 'center' },
});
