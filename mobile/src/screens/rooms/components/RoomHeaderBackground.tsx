import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Image, StyleSheet, View } from 'react-native';

const video = require('../../../../assets/videos/cuevo-room-gradient-v2.mp4');
const poster = require('../../../../assets/videos/cuevo-room-gradient-v2-poster.png');

export default function RoomHeaderBackground() {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [hasFrame, setHasFrame] = useState(false);
  const player = useVideoPlayer(video, instance => {
    instance.loop = true;
    instance.muted = true;
    instance.audioMixingMode = 'mixWithOthers';
  });
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useFocusEffect(useCallback(() => {
    function update() {
      if (!reduceMotion && AppState.currentState === 'active') player.play();
      else player.pause();
    }
    update();
    const subscription = AppState.addEventListener('change', update);
    return () => { subscription.remove(); player.pause(); };
  }, [player, reduceMotion]));

  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden style={styles.background}>
    <Image source={poster} resizeMode="stretch" style={styles.poster} />
    <VideoView player={player} nativeControls={false} contentFit="fill" surfaceType="textureView" onFirstFrameRender={() => setHasFrame(true)} style={[StyleSheet.absoluteFill, { opacity: hasFrame && !reduceMotion ? 1 : 0 }]} />
  </View>;
}
const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, borderRadius: 25, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  poster: { width: '100%', height: '100%' },
});
