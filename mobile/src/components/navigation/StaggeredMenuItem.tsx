import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, useAnimatedValue } from 'react-native';

export default function StaggeredMenuItem({ index, children }: { index: number; children: ReactNode }) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    let mounted = true;
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 280, delay: index * 90,
      easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false,
    });
    const show = (reduced: boolean) => {
      if (!mounted) return;
      if (reduced) { animation.stop(); progress.setValue(1); }
      else animation.start();
    };
    AccessibilityInfo.isReduceMotionEnabled().then(show).catch(() => show(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', show);
    return () => { mounted = false; animation.stop(); subscription.remove(); };
  }, [index, progress]);

  return (
    <Animated.View style={{
      opacity: progress,
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
      ],
    }}>
      {children}
    </Animated.View>
  );
}
