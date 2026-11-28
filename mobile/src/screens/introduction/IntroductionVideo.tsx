import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useState } from 'react';
import { AppState, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

export default function IntroductionVideo({ source, poster }: { source: VideoSource; poster: ImageSourcePropType }) {
  const [hasFrame, setHasFrame] = useState(false);
  const player = useVideoPlayer(source, instance => {
    instance.loop = true;
    instance.muted = true;
    instance.audioMixingMode = 'mixWithOthers';
  });

  useFocusEffect(useCallback(() => {
    function update() {
      if (AppState.currentState === 'active') player.play();
      else player.pause();
    }
    update();
    const subscription = AppState.addEventListener('change', update);
    return () => { subscription.remove(); player.pause(); };
  }, [player]));

  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden style={StyleSheet.absoluteFill}>
      <Image source={poster} resizeMode="contain" style={styles.media} />
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="contain"
        surfaceType="textureView"
        onFirstFrameRender={() => setHasFrame(true)}
        style={[styles.media, { opacity: hasFrame ? 1 : 0 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  media: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
});
