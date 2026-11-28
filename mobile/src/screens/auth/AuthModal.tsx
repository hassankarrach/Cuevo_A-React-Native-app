import ModalSurface from '../../components/ModalSurface';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastViewport } from '../../components/AppToast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import LoginDecoration from '../login/components/LoginDecoration';

type AuthModalProps = {
  visible: boolean;
  title: string;
  progress?: number;
  scrollEnabled?: boolean;
  children: ReactNode;
  onBack?: () => void;
  onClose: () => void;
};

export default function AuthModal({ visible, title, children, progress, scrollEnabled = true, onClose, onBack = onClose }: AuthModalProps) {
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(1000));

  useEffect(() => {
    if (!visible) {
      slide.setValue(1000);
      return;
    }
    const animation = Animated.timing(slide, { toValue: 0, duration: 300, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [visible, slide]);

  useEffect(() => {
    if (!visible) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => back.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <ToastViewport>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss account setup"
        />
        <Animated.View
          style={[
            styles.sheetFrame,
            { transform: [{ translateY: slide }] },
            {
              // Preserve the original sheet size and position.
              marginTop: insets.top + 56 + 12,
            },
          ]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <ModalSurface radius={36} topOnly />
          <LoginDecoration />
          <View style={styles.header}>
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.closeButton}
            >
              <View style={styles.arrowShaft} />
              <View style={styles.arrowHead} />
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>
          {progress !== undefined && (
            <View accessibilityRole="progressbar" accessibilityLabel="Account setup progress"
              accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          )}
          <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top + 68}>
            <ScrollView scrollEnabled={scrollEnabled} bounces={scrollEnabled} style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </ToastViewport>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheetFrame: {
    flex: 1,
    borderTopLeftRadius: 36,
    backgroundColor: '#FFFCF8',
    borderTopWidth: 1,
    borderTopColor: '#ECEDEF',
  },
  sheet: {
    flex: 1,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  closeButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 24,
    color: colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#ECEDEF', marginHorizontal: 12, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
  body: { flex: 1 },
  formScroll: { marginHorizontal: -16 },
  formContent: { paddingHorizontal: 16, paddingBottom: 16 },
  arrowShaft: {
    position: 'absolute',
    width: 23,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#231B18',
  },
  arrowHead: {
    position: 'absolute',
    left: 11,
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#231B18',
    transform: [{ rotate: '45deg' }],
  },
});
