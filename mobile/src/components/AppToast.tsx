import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppColors } from '../theme/useAppColors';
import { BlurTargetView, BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast, { type ToastConfig } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { AppToastType } from '../utils/toast';

const ToastBlurContext = createContext<React.RefObject<ComponentRef<typeof View> | null> | undefined>(undefined);

// Each native window needs its own target; keep the toast outside its capture.
export function ToastViewport({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const target = useRef<ComponentRef<typeof View> | null>(null);
  return <ToastBlurContext.Provider value={target}>
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>
      {active && <AppToast />}
    </View>
  </ToastBlurContext.Provider>;
}

const appearances = {
  success: { icon: 'checkmark-circle', color: colors.primary, background: 'rgba(255,225,205,0.65)' },
  error: { icon: 'alert-circle', color: '#C5392A', background: 'rgba(253,222,216,0.65)' },
  info: { icon: 'information-circle', color: '#806329', background: 'rgba(250,235,194,0.65)' },
} as const;

function ToastCard({ type, title, message }: { type: AppToastType; title?: string; message?: string }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const blurTarget = useContext(ToastBlurContext);
  const appearance = appearances[type];
  return <Pressable onPress={() => Toast.hide()} accessibilityRole="button"
    accessibilityLabel={[title, message].filter(Boolean).join('. ')} accessibilityHint="Dismiss message" style={styles.card}>
    <View style={styles.surface}>
      <BlurView pointerEvents="none" blurTarget={blurTarget} blurMethod={blurTarget ? "dimezisBlurView" : "none"} intensity={45} tint={colors.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.glaze} />
    <View style={[styles.icon, { backgroundColor: appearance.background }]}><Ionicons name={appearance.icon} size={34} color={appearance.color} accessible={false} /></View>
    <View style={styles.copy}><Text style={styles.title}>{title}</Text>{!!message && <Text style={styles.message}>{message}</Text>}</View>
    </View>
  </Pressable>;
}
const config: ToastConfig = {
  success: ({ text1, text2 }) => <ToastCard type="success" title={text1} message={text2} />,
  error: ({ text1, text2 }) => <ToastCard type="error" title={text1} message={text2} />,
  info: ({ text1, text2 }) => <ToastCard type="info" title={text1} message={text2} />,
};

// Native modals also mount this host so messages appear above their content.
export default function AppToast() {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <Toast config={config} topOffset={insets.top + 10} position="top" visibilityTime={3000}
    animationConfig={reduceMotion ? { type: 'timing', duration: 0 } : { type: 'spring', friction: 9, tension: 65 }} />;
}
const baseStyles = StyleSheet.create({
  card: { width: '90%', maxWidth: 400, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)', boxShadow: '0px 7px 24px rgba(40,47,57,0.12)' },
  surface: { minHeight: 78, borderRadius: 22.5, overflow: 'hidden', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: 'rgba(255,255,255,0.18)' },
  glaze: { ...StyleSheet.absoluteFill, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.16) 100%)' },
  icon: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.text },
  message: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
});
