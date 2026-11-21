import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getMockAccount } from '../../data/mockAccounts';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import ProfileHeader from './ProfileHeader';
import ProfileLayout from './ProfileLayout';

export default function OtherProfileScreen({ userId }: { userId: string }) {
  const account = getMockAccount(userId);
  const [requestSent, setRequestSent] = useState(false);
  if (!account) return <ProfileLayout title="Profile"><Text style={styles.bio}>Profile unavailable</Text></ProfileLayout>;
  return <ProfileLayout title="Profile">
    <ProfileHeader profile={account} verified={account.verified} subscriptionActive={account.subscriptionActive} avatarColor={account.avatarColor} />
    <View style={styles.details}>
      <View style={styles.connectionRow}>
        <View style={styles.metadata}>
          {!!account.username && <Text selectable style={styles.username}>@{account.username}</Text>}
          {!!account.location && <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.textSecondary} accessible={false} />
            <Text style={styles.location}>{account.location}</Text>
          </View>}
        </View>
        <Pressable onPress={() => { setRequestSent(!requestSent); showToast(requestSent ? 'info' : 'success', requestSent ? 'Friend request canceled' : 'Friend request sent', account.displayName); }} accessibilityRole="button"
          accessibilityLabel={requestSent ? `Cancel request to ${account.displayName}` : `Send friend request to ${account.displayName}`}
          accessibilityState={{ selected: requestSent }}
          style={({ pressed }) => [styles.requestButton, requestSent && styles.requestPending, pressed && styles.pressed]}>
          <Ionicons name={requestSent ? 'checkmark' : 'person-add'} size={21} color={requestSent ? '#C84020' : '#FFFFFF'} accessible={false} />
        </Pressable>
      </View>
      {requestSent && <Text accessibilityLiveRegion="polite" style={styles.requestStatus}>Request sent</Text>}
      {!!account.bio && <View style={styles.section}>
        <Text style={styles.heading}>About</Text>
        <Text selectable style={styles.bio}>{account.bio}</Text>
      </View>}
      {account.genres.length > 0 && <View style={styles.section}>
        <Text style={styles.heading}>Music taste</Text>
        <View style={styles.tags}>{account.genres.map(genre => <View key={genre} style={styles.tag}><Text style={styles.tagText}>{genre}</Text></View>)}</View>
      </View>}
    </View>
  </ProfileLayout>;
}

const styles = StyleSheet.create({
  details: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metadata: { flex: 1, gap: 8 },
  username: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  location: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  requestButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  requestPending: { backgroundColor: '#FFF0E8' },
  pressed: { opacity: 0.7 },
  requestStatus: { fontFamily: fonts.medium, fontSize: 12, color: '#C84020', marginTop: 12, textAlign: 'right' },
  section: { marginTop: 30, gap: 12 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  bio: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24, color: colors.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFF0E8' },
  tagText: { fontFamily: fonts.medium, fontSize: 13, color: '#C84020' },
});
