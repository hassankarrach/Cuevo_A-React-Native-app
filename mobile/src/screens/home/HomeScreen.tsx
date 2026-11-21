import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { mockNotifications, type MockNotification } from '../../data/mockNotifications';
import { showToast } from '../../utils/toast';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AccountMenuModal from './components/AccountMenuModal';
import HomeHeader from './components/HomeHeader';
import HomeSkeleton from './components/HomeSkeleton';
import HomeHero from './components/HomeHero';
import SearchModal from './components/SearchModal';
import HomeRooms from './components/HomeRooms';
import HomePlaylists from './components/HomePlaylists';
import NotificationsModal from './components/notifications/NotificationsModal';

// Temporary loading preview; replace the timer with real data readiness later.
const HOME_LOADING_DELAY_MS = 2000;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), HOME_LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, []));
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
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.sections, { paddingTop: insets.top + headerHeight, paddingBottom: 65 + Math.max(insets.bottom, 16) + 24 }]}>
        <View style={styles.hero}><HomeHero /></View>
        {loading ? <HomeSkeleton /> : <>
          <HomeRooms />
          <HomePlaylists />
        </>}
      </ScrollView>
      <View pointerEvents="box-none" style={[styles.navbar, { paddingTop: insets.top }]}>
      <View onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        <HomeHeader onSearchPress={() => { setAccountOpen(false); setNotificationsOpen(false); setSearchOpen(true); }} onAccountPress={() => { setNotificationsOpen(false); setAccountOpen(true); }} accountOpen={accountOpen} onNotificationsPress={() => { setAccountOpen(false); setNotificationsOpen(true); }} unreadCount={unreadCount} notificationsOpen={notificationsOpen} />
      </View>
      </View>
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <AccountMenuModal visible={accountOpen} top={insets.top + headerHeight + 6} onClose={() => setAccountOpen(false)} />
      <NotificationsModal visible={notificationsOpen} top={insets.top + headerHeight + 6}
        notifications={notifications} onClose={() => setNotificationsOpen(false)} onOpen={openNotification} onRespond={respond}
        onReadAll={() => setNotifications(current => current.map(notification => ({ ...notification, read: true })))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navbar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, backgroundColor: '#FFFFFF'},
  hero: { marginTop: 10 },
  sections: { flexGrow: 1 },
  screen: { flex: 1, backgroundColor: '#FFFCF8', paddingHorizontal: 20 },
});
