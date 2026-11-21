import AccountBadges from '../../../components/AccountBadges';
import { useLocalProfile } from '../../../state/ProfileContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

type HomeHeaderProps = {
  onAccountPress: () => void;
  onSearchPress: () => void;
  accountOpen?: boolean;
  displayName?: string;
  avatarSource?: ImageSourcePropType;
  onNotificationsPress?: () => void;
  unreadCount?: number;
  notificationsOpen?: boolean;
};

export default function HomeHeader({
  onAccountPress,
  onSearchPress,
  accountOpen = false,
  displayName,
  avatarSource,
  onNotificationsPress,
  unreadCount = 0,
  notificationsOpen = false,
}: HomeHeaderProps) {
  const { profile, accountStatus } = useLocalProfile();
  const photo = avatarSource ?? (profile.avatarUri ? { uri: profile.avatarUri } : require('../../../../assets/avatars/cuevo-mascot.png'));
  return (
    <View style={styles.header}>
      <Pressable onPress={onAccountPress} accessibilityRole="button" accessibilityLabel="Open account menu" accessibilityState={{ expanded: accountOpen }}>
        <Image source={photo} style={styles.avatar} accessible={false} />
      </Pressable>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hello,</Text>
        <View style={styles.nameRow}><Text accessibilityRole="header" numberOfLines={1} style={styles.name}>{displayName ?? profile.displayName}</Text><AccountBadges {...accountStatus} size={18} /></View>
      </View>
      <View style={styles.headerActions}>
      <Pressable onPress={onSearchPress} accessibilityRole="button" accessibilityLabel="Search rooms, playlists, songs and profiles"
        style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
        <Ionicons name="search" size={25} color={colors.text} accessible={false} />
      </Pressable>
      <Pressable onPress={onNotificationsPress} disabled={!onNotificationsPress}
        accessibilityRole="button" accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        accessibilityState={{ disabled: !onNotificationsPress, expanded: notificationsOpen }}
        style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
        <Ionicons name="notifications" size={25} color={colors.text} accessible={false} />
        {unreadCount > 0 && <View style={styles.notificationDot} accessible={false} />}
      </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF0E9' },
  greeting: { flex: 1, minWidth: 0, gap: 2 },
  hello: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 19, lineHeight: 26, color: colors.text },
  headerActions: { flexDirection: 'row', gap: 6 },
  notificationButton: { width: 44, height: 44, borderWidth: 1, borderColor: '#E2E2E2', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  notificationDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#FFFCF8' },
  pressed: { backgroundColor: '#F3EEE9' },
});
