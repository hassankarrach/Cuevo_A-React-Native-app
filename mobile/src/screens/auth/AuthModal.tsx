import ModalSurface from '../../components/ModalSurface';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppToast from '../../components/AppToast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import LoginDecoration from '../login/components/LoginDecoration';

type AuthModalProps = {
  visible: boolean;
  title: string;
  progress?: number;
  children: ReactNode;
  onBack?: () => void;
  onClose: () => void;
};

export default function AuthModal({ visible, title, children, progress, onClose, onBack = onClose }: AuthModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss account setup"
        />
        <View
          style={[
            styles.sheet,
            {
              // Safe-area top + the 56px wordmark row + a small gap.
              marginTop: insets.top + 56 + 12,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <ModalSurface radius={32} topOnly />
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
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
        {visible && <AppToast />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheet: {
    flex: 1,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
