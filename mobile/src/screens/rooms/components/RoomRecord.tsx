import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, StyleSheet, useAnimatedValue, View, type ImageSourcePropType } from 'react-native';

export default function RoomRecord({ cover, playing, tint }: { cover?: ImageSourcePropType; playing: boolean; tint: string }) {
  const rotation = useAnimatedValue(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useFocusEffect(useCallback(() => {
    let animation: Animated.CompositeAnimation | undefined;
    function update() {
      animation?.stop();
      if (!playing || reduceMotion || AppState.currentState !== 'active') return;
      rotation.setValue(0);
      animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
      animation.start();
    }
    update();
    const subscription = AppState.addEventListener('change', update);
    return () => { animation?.stop(); subscription.remove(); };
  }, [playing, reduceMotion, rotation]));
  return <View style={styles.frame} pointerEvents="none" accessible={false}>
    <Animated.View style={[styles.record, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
      {[94, 86, 78, 70].map(size => <View key={size} style={[styles.groove, { width: `${size}%`, height: `${size}%` }]} />)}
      <View style={styles.sheen} />
      <View style={[styles.label, { backgroundColor: tint }]}>
        {cover ? <Image source={cover} style={styles.cover} /> : <Ionicons name="musical-notes" size={32} color="#FFFFFF" />}
      </View>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: '46%', maxWidth: 176, aspectRatio: 1, padding: 3 },
  record: { flex: 1, borderRadius: 200, backgroundColor: '#191817', borderWidth: 2, borderColor: '#302C29', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 5px 10px rgba(35,27,24,0.16)' },
  groove: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: '#393633' },
  sheen: { ...StyleSheet.absoluteFill, borderRadius: 200, backgroundImage: 'linear-gradient(135deg, transparent 10%, rgba(255,255,255,0.12) 30%, transparent 45%, transparent 65%, rgba(255,255,255,0.08) 80%, transparent 95%)' },
  label: { width: '57%', height: '57%', borderRadius: 100, borderWidth: 3, borderColor: '#0F0E0D', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cover: { width: '100%', height: '100%' },
});
