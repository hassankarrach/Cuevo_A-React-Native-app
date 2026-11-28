import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useAnimatedValue, View } from 'react-native';

export type RoomGenre = 'disco' | 'rnb' | 'pop';
const labelColors: Record<RoomGenre, string> = { disco: '#FF4D24', rnb: '#797FBD', pop: '#E9AD47' };

export default function RoomVinyl({ genre }: { genre: RoomGenre }) {
  const styles = useThemedStyles(baseStyles);

  const rotation = useAnimatedValue(0);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    rotation.setValue(0);
    if (reduceMotion) return;
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1, duration: 6500, easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => { animation.stop(); rotation.setValue(0); };
  }, [reduceMotion, rotation]));

  return (
    <Animated.View accessible={false} style={[styles.record, {
      transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
    }]}>
      {[28, 24, 20].map((size) => <View key={size} style={[styles.groove, { width: size, height: size, borderRadius: size / 2 }]} />)}
      <View style={styles.sheen} />
      <View style={[styles.label, { backgroundColor: labelColors[genre] }]}>
        <View style={styles.labelMark} />
        <View style={styles.spindle} />
      </View>
    </Animated.View>
  );
}

const baseStyles = StyleSheet.create({
  record: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#191919', borderWidth: 1, borderColor: '#343434', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  groove: { position: 'absolute', borderWidth: 0.5, borderColor: '#404040' },
  sheen: { ...StyleSheet.absoluteFill, backgroundImage: 'linear-gradient(125deg, rgba(255,255,255,0) 15%, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0) 43%, rgba(255,255,255,0) 66%, rgba(255,255,255,0.12) 80%, rgba(255,255,255,0) 95%)' },
  label: { width: 13, height: 13, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  labelMark: { position: 'absolute', width: 4, height: 1, backgroundColor: 'rgba(255,255,255,0.7)', top: 2 },
  spindle: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFF8EC', borderWidth: 0.5, borderColor: '#343434' },
});
