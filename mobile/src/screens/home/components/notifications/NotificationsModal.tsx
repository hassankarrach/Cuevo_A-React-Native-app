import ModalSurface from '../../../../components/ModalSurface';
import AppToast from '../../../../components/AppToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { AccessibilityInfo, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MockNotification, NotificationKind } from '../../../../data/mockNotifications';
import { getMockAccount } from '../../../../data/mockAccounts';
import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/fonts';

const appearances: Record<NotificationKind, ComponentProps<typeof Ionicons>['name']> = {
  'friend-request': 'person-add',
  'friend-accepted': 'people',
  'room-invite': 'radio',
  'playlist-invite': 'albums',
  'playlist-update': 'musical-notes',
  'room-activity': 'people-circle',
};

export default function NotificationsModal({ visible, top, notifications, onClose, onReadAll, onOpen, onRespond }: {
  visible: boolean; top: number; notifications: MockNotification[]; onClose: () => void; onReadAll: () => void;
  onOpen: (notification: MockNotification) => void;
  onRespond: (id: string, response: 'accepted' | 'declined') => void;
}) {
  const { width, height } = useWindowDimensions();
  const [pop] = useState(() => new Animated.Value(0));
  const isVisible = useRef(visible);
  useEffect(() => {
    isVisible.current = visible;
    if (!visible) {
      pop.stopAnimation();
      pop.setValue(0);
    }
    return () => { pop.stopAnimation(); };
  }, [visible, pop]);

  async function popIn() {
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    if (!isVisible.current) return;
    if (reduceMotion) pop.setValue(1);
    else Animated.spring(pop, { toValue: 1, stiffness: 340, damping: 25, mass: 0.8, useNativeDriver: true }).start();
  }
  const insets = useSafeAreaInsets();
  const unread = notifications.filter(notification => !notification.read).length;
  const panelTop = Math.min(top, insets.top + 85);
  return <Modal visible={visible} transparent animationType="none" onShow={popIn} onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss notifications" style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.panel, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }, { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }], top: panelTop, right: 20, width: width - 40, maxHeight: Math.max(180, Math.min(440, height * 0.56, height - panelTop - insets.bottom - 20)) }]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <ModalSurface radius={23} />
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Notifications</Text>
          <Pressable onPress={onReadAll} disabled={unread === 0} accessibilityRole="button" accessibilityState={{ disabled: unread === 0 }} style={styles.readAll}>
            <Text style={[styles.readAllText, unread === 0 && styles.muted]}>Mark all read</Text>
          </Pressable>
        </View>
        <View pointerEvents="none" style={styles.divider} />
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.list}>
          {notifications.map(notification => {
            const actor = getMockAccount(notification.actorId);
            const isFriend = notification.destination.type === 'profile';
            const actionable = ['friend-request', 'room-invite', 'playlist-invite'].includes(notification.kind);
            return <View key={notification.id} style={[styles.notification, !notification.read && styles.unread]}>
              <View style={styles.avatarContainer}>
                {isFriend && !actor?.avatarUri
                  ? <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: actor?.avatarColor ?? '#E8E8E8' }]}><Text style={styles.initial}>{actor?.displayName.charAt(0) ?? '?'}</Text></View>
                  : <Image source={isFriend && actor?.avatarUri ? { uri: actor.avatarUri } : require('../../../../../assets/covers/notification-default.jpg')} style={styles.avatar} accessible={false} />}
                <View style={styles.typeBadge}><Ionicons name={appearances[notification.kind]} size={12} color="#777777" accessible={false} /></View>
              </View>
              <View style={styles.body}>
                <Pressable onPress={() => onOpen(notification)} accessibilityRole="button" accessibilityLabel={`${notification.read ? '' : 'Unread. '}${notification.title}. ${notification.message}`} style={styles.open}>
                  <Text numberOfLines={1} style={styles.itemTitle}>{notification.title}</Text>
                  <Text numberOfLines={2} style={styles.message}>{notification.message}</Text>
                  <Text style={styles.time}>{notification.minutesAgo < 60 ? `${notification.minutesAgo} min ago` : `${Math.floor(notification.minutesAgo / 60)} hr ago`}</Text>
                </Pressable>
                <View style={styles.actions}>
                {actionable && !notification.response && <>
                  <Pressable onPress={() => onRespond(notification.id, 'accepted')} accessibilityRole="button" accessibilityLabel={`Accept ${notification.title.toLowerCase()}`} hitSlop={4} style={styles.accept}><Ionicons name="checkmark" size={20} color="#FFFFFF" accessible={false} /></Pressable>
                  <Pressable onPress={() => onRespond(notification.id, 'declined')} accessibilityRole="button" accessibilityLabel={`Decline ${notification.title.toLowerCase()}`} hitSlop={4} style={styles.decline}><Ionicons name="close" size={20} color={colors.textSecondary} accessible={false} /></Pressable>
                </>}
                {notification.response && <View accessible accessibilityLiveRegion="polite" accessibilityLabel={notification.response === 'accepted' ? 'Accepted' : 'Declined'}><Ionicons name={notification.response === 'accepted' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={22} color={colors.textSecondary} accessible={false} /></View>}
                </View>
              </View>
            </View>;
          })}
          {notifications.length === 0 && <View style={styles.empty}><Ionicons name="notifications-off" size={30} color={colors.textSecondary} /><Text style={styles.message}>You’re all caught up.</Text></View>}
        </ScrollView>
      </Animated.View>
      {visible && <AppToast />}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(35,27,24,0.16)' },
  panel: { position: 'absolute', borderRadius: 23, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent', boxShadow: '0px 12px 35px rgba(55,34,21,0.18)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 18, paddingVertical: 8 },
  divider: { height: 1, backgroundImage: 'linear-gradient(to right, rgba(220,216,211,0) 0%, #DCD8D3 50%, rgba(220,216,211,0) 100%)' },
  title: { fontFamily: fonts.semibold, fontSize: 19, color: colors.text, flexShrink: 1 },
  readAll: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  readAllText: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  muted: { color: '#A3978D' },
  scroll: { borderBottomLeftRadius: 23, borderBottomRightRadius: 23 },
  list: { padding: 8, paddingBottom: 12 },
  notification: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: 16, marginBottom: 3 },
  unread: { backgroundColor: '#F0F0EF' },
  avatarContainer: { width: 46, height: 46, marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 13 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.semibold, fontSize: 20, color: '#666666' },
  typeBadge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEEEEE', borderWidth: 2, borderColor: '#FFFCF8', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  open: { flex: 1, minWidth: 0, gap: 4 },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.text },
  message: { minHeight: 36, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  time: { fontFamily: fonts.regular, fontSize: 10, color: '#94867C', marginTop: 2 },
  actions: { width: 80, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  accept: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  decline: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#DADADA', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 24, gap: 12 },
});
