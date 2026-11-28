import { useThemedStyles } from '../../../../theme/useThemedStyles';
import { useAppColors } from '../../../../theme/useAppColors';
import ModalSurface from '../../../../components/ModalSurface';
import { ToastViewport } from '../../../../components/AppToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';
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
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

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
    <ToastViewport active={visible}>
    <View style={styles.overlay}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss notifications" style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.panel, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }, { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }], top: panelTop, right: 18, width: width - 36, maxHeight: Math.max(180, Math.min(440, height * 0.56, height - panelTop - insets.bottom - 20)) }]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <ModalSurface solid radius={23} />
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
            const summary = notification.message.replace(/\.$/, '').replace('wants to connect with you', 'wants to connect').replace('invited you to build', 'invited you to').replace('added a song to', 'updated').replace('accepted your friend request', 'accepted your request');
            const isFriend = notification.destination.type === 'profile';
            const actionable = ['friend-request', 'room-invite', 'playlist-invite'].includes(notification.kind);
            return <View key={notification.id} style={[styles.notification, !notification.read && styles.unread]}>
              <View style={styles.avatarContainer}>
                {isFriend && !actor?.avatarUri
                  ? <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: actor?.avatarColor ?? '#E8E8E8' }]}><Text style={styles.initial}>{actor?.displayName.charAt(0) ?? '?'}</Text></View>
                  : <Image source={isFriend && actor?.avatarUri ? { uri: actor.avatarUri } : require('../../../../../assets/covers/notification-default.jpg')} style={styles.avatar} accessible={false} />}
                <View style={styles.kindBadge} pointerEvents="none"><Ionicons name={appearances[notification.kind]} size={11} color="#FFFFFF" accessible={false} /></View>
              </View>
              <View style={styles.body}>
                <Pressable onPress={() => onOpen(notification)} accessibilityRole="button" accessibilityLabel={`${notification.read ? '' : 'Unread. '}${summary}`} style={styles.titleRow}>
                  <Text numberOfLines={2} style={styles.itemTitle}>{summary}</Text>
                  <View style={styles.meta}>
                    <Text style={styles.time}>{notification.minutesAgo < 60 ? `${notification.minutesAgo} min ago` : `${Math.floor(notification.minutesAgo / 60)} hr ago`}</Text>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                </Pressable>
                {(actionable || notification.response) && <View style={styles.actions}>
                {actionable && !notification.response && <View style={styles.actionGroup}>
                  <Pressable onPress={() => onRespond(notification.id, 'accepted')} accessibilityRole="button" accessibilityLabel={`Accept ${notification.title.toLowerCase()}`} style={styles.accept} hitSlop={4}><Text style={styles.acceptText}>Accept</Text></Pressable>
                  <Pressable onPress={() => onRespond(notification.id, 'declined')} accessibilityRole="button" accessibilityLabel={`Decline ${notification.title.toLowerCase()}`} style={styles.decline} hitSlop={4}><Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}><Path d="M6 6 18 18M18 6 6 18" stroke={colors.textSecondary} strokeWidth={4} strokeLinecap="round" /></Svg></Pressable>
                </View>}
                {notification.response && <View accessible accessibilityLiveRegion="polite" accessibilityLabel={notification.response === 'accepted' ? 'Accepted' : 'Declined'}><Ionicons name={notification.response === 'accepted' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={22} color={colors.textSecondary} accessible={false} /></View>}
                </View>}
              </View>
            </View>;
          })}
          {notifications.length === 0 && <View style={styles.empty}><Ionicons name="notifications-off" size={30} color={colors.textSecondary} /><Text style={styles.message}>You’re all caught up.</Text></View>}
        </ScrollView>
      </Animated.View>
    </View>
    </ToastViewport>
  </Modal>;
}

const baseStyles = StyleSheet.create({
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
  notification: { flexDirection: 'row', gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14, marginBottom: 6 },
  unread: { backgroundColor: 'rgba(128,128,128,0.035)' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 },
  unreadDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  avatarContainer: { width: 36, height: 36, marginTop: 2 },
  avatar: { width: 36, height: 36, borderRadius: 10 },
  kindBadge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(to top left, #FF6A35 0%, #FFD5A6 100%)', borderWidth: 2, borderColor: '#FFFCF8' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.semibold, fontSize: 20, color: '#666666' },
  body: { flex: 1, minWidth: 0, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  itemTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: '#171717' },
  message: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  time: { fontFamily: fonts.regular, fontSize: 10, color: '#94867C', flexShrink: 0, marginLeft: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accept: { paddingHorizontal: 14, minHeight: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  acceptText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  decline: { width: 36, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: '#D6D6D6', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 24, gap: 12 },
});
