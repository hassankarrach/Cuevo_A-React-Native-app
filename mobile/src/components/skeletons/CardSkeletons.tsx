import { useAppColors, type AppColors } from '../../theme/useAppColors';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, AppState, StyleSheet, View, type ViewStyle } from 'react-native';

function Bone({ style }: { style?: ViewStyle }) {
  const styles = makeStyles(useAppColors());
  return <View style={[styles.bone, style]} />;
}

export function SkeletonPulse({ children, label = 'Loading home' }: { children: ReactNode; label?: string }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let active = true;
    let reduced = true;
    let animation: Animated.CompositeAnimation | undefined;
    function update() {
      animation?.stop();
      opacity.setValue(1);
      if (!active || reduced || AppState.currentState !== 'active') return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 650, useNativeDriver: true, isInteraction: false }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true, isInteraction: false }),
      ]));
      animation.start();
    }
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) { reduced = value; update(); } }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduced = value; update(); });
    const appState = AppState.addEventListener('change', update);
    return () => { active = false; animation?.stop(); motion.remove(); appState.remove(); };
  }, [opacity]);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }}>
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity }}>{children}</Animated.View>
  </View>;
}

export function RoomCardSkeleton({ grid = false }: { grid?: boolean }) {
  const styles = makeStyles(useAppColors());
  return <View style={[styles.room, grid && { width: '48%' }]}>
    <View style={styles.roomBanner}><Bone style={{ width: 100, height: 16 }} /></View>
    <View style={styles.roomDetails}>
      <View style={styles.row}><Bone style={{ width: 36, height: 36, borderRadius: 18 }} /><View style={styles.roomCopy}><Bone style={{ width: '90%', height: 12 }} /><Bone style={{ width: '65%', height: 10 }} /></View></View>
      <View style={styles.listeners}>{[0, 1, 2].map(index => <Bone key={index} style={{ width: 23, height: 23, borderRadius: 12, marginLeft: index ? -5 : 0 }} />)}<Bone style={{ width: 35, height: 10, marginLeft: 8 }} /></View>
    </View>
  </View>;
}

export function PlaylistCardSkeleton() {
  const styles = makeStyles(useAppColors());
  return <View style={styles.playlist}>
    <Bone style={{ width: 76, height: 76, borderRadius: 14 }} />
    <View style={styles.playlistCopy}>
      <Bone style={{ width: '76%', height: 14 }} />
      <Bone style={{ width: '90%', height: 10 }} />
      <View style={styles.row}>{[0, 1, 2].map(index => <Bone key={index} style={{ width: 18, height: 18, borderRadius: 9 }} />)}</View>
    </View>
  </View>;
}

export function SearchResultSkeleton() {
  const styles = makeStyles(useAppColors());
  return <View style={styles.searchResult}>
    <View><Bone style={{ width: 46, height: 46, borderRadius: 9 }} /><Bone style={styles.searchTypeBadge} /></View>
    <View style={styles.searchCopy}><Bone style={{ width: '65%', height: 14 }} /><Bone style={{ width: '42%', height: 11 }} /></View>
  </View>;
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  searchResult: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  searchCopy: { flex: 1, gap: 7 },
  searchTypeBadge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.canvas },
  bone: { backgroundColor: colors.skeleton, borderRadius: 6 },
  room: { width: 164, height: 164, padding: 2, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  roomBanner: { height: 57, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.skeletonBanner, alignItems: 'center', justifyContent: 'center' },
  roomDetails: { paddingHorizontal: 8, paddingTop: 9, gap: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomCopy: { flex: 1, gap: 7 },
  listeners: { flexDirection: 'row', alignItems: 'center' },
  playlist: { minHeight: 86, padding: 4, gap: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  playlistCopy: { flex: 1, minWidth: 0, paddingRight: 30, gap: 8 },
});
