import ModalSurface from '../../../components/ModalSurface';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { AccessibilityInfo, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

type Icon = ComponentProps<typeof Ionicons>['name'];
export default function AccountMenuModal({ visible, top, onClose }: { visible: boolean; top: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pop] = useState(() => new Animated.Value(0));
  const isVisible = useRef(visible);
  useEffect(() => {
    isVisible.current = visible;
    if (!visible) { pop.stopAnimation(); pop.setValue(0); }
    return () => pop.stopAnimation();
  }, [visible, pop]);
  async function popIn() {
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    if (!isVisible.current) return;
    if (reduceMotion) pop.setValue(1);
    else Animated.spring(pop, { toValue: 1, stiffness: 340, damping: 25, mass: 0.8, useNativeDriver: true }).start();
  }
  function navigate(path: '/profile' | '/settings' | '/help') { onClose(); router.push(path); }
  function item(label: string, icon: Icon, onPress: () => void, danger = false) {
    return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={danger ? '#C5392A' : colors.primary} accessible={false} />
      <Text style={[styles.itemText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>;
  }
  const panelTop = Math.min(top, insets.top + 85);
  return <Modal visible={visible} transparent animationType="none" onShow={popIn} onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss account menu" />
      <Animated.View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.panel, { top: panelTop, width: width - 40, maxHeight: Math.max(180, Math.min(560, height - panelTop - insets.bottom - 20)), transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }, { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
        <ModalSurface radius={23} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {item('Profile', 'person-circle', () => navigate('/profile'))}
          {item('Settings', 'settings', () => navigate('/settings'))}
          {item('Help & about', 'help-circle', () => navigate('/help'))}
          <View style={styles.divider} />
          {item('Log out', 'log-out', () => { onClose(); router.dismissAll(); router.replace('/'); }, true)}
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(35,27,24,0.16)' },
  panel: { position: 'absolute', left: 20, borderRadius: 23, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent', boxShadow: '0px 12px 35px rgba(55,34,21,0.18)' },
  divider: { height: 1, backgroundImage: 'linear-gradient(to right, rgba(220,216,211,0) 0%, #DCD8D3 50%, rgba(220,216,211,0) 100%)' },
  content: { padding: 8, paddingBottom: 12 },
  item: { minHeight: 52, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16 },
  pressed: { backgroundColor: '#FFF4EC' },
  itemText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  dangerText: { color: '#C5392A' },
});
