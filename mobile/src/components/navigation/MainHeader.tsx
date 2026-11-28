import { useAppColors } from '../../theme/useAppColors';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockNotifications, type MockNotification } from '../../data/mockNotifications';
import { showToast } from '../../utils/toast';
import HomeHeader from '../../screens/home/components/HomeHeader';
import SearchModal from '../../screens/home/components/SearchModal';
import AccountMenuModal from '../../screens/home/components/AccountMenuModal';
import NotificationsModal from '../../screens/home/components/notifications/NotificationsModal';

export default function MainHeader() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [headerHeight, setHeaderHeight] = useState(72);
  const unreadCount = notifications.filter(notification => !notification.read).length;

  function respond(id: string, response: 'accepted' | 'declined') {
    setNotifications(current => current.map(notification => notification.id === id ? { ...notification, read: true, response } : notification));
    const notification = notifications.find(item => item.id === id);
    const subject = notification?.kind === 'friend-request' ? 'Friend request' : 'Invitation';
    showToast(response === 'accepted' ? 'success' : 'info', `${subject} ${response}`);
  }

  function openNotification(notification: MockNotification) {
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read: true } : item));
    setNotificationsOpen(false);
    const { type, id } = notification.destination;
    if (type === 'profile') router.push({ pathname: '/profile', params: { userId: id } });
    else if (type === 'room') router.push({ pathname: '/room/[id]', params: { id } });
    else router.push({ pathname: '/playlist/[id]', params: { id } });
  }
  return <>
      <View pointerEvents="box-none" style={{ paddingTop: insets.top, paddingHorizontal: 20, backgroundColor: colors.dark ? 'transparent' : colors.surface }}>
      <View onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        <HomeHeader onSearchPress={() => { setAccountOpen(false); setNotificationsOpen(false); setSearchOpen(true); }} onAccountPress={() => { setNotificationsOpen(false); setAccountOpen(true); }} accountOpen={accountOpen} onNotificationsPress={() => { setAccountOpen(false); setNotificationsOpen(true); }} unreadCount={unreadCount} notificationsOpen={notificationsOpen} />
      </View>
      </View>
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <AccountMenuModal visible={accountOpen} top={insets.top + headerHeight + 6} onClose={() => setAccountOpen(false)} />
      <NotificationsModal visible={notificationsOpen} top={insets.top + headerHeight + 6}
        notifications={notifications} onClose={() => setNotificationsOpen(false)} onOpen={openNotification} onRespond={respond}
        onReadAll={() => setNotifications(current => current.map(notification => ({ ...notification, read: true })))} />
  </>;
}
