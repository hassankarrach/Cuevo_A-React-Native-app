import { useThemedStyles } from '../../../theme/useThemedStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMockAccount } from '../../../data/mockAccounts';
import { useLocalProfile } from '../../../state/ProfileContext';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

export default function RoomParticipants({ participantIds, hostId, hostLabel = 'room host and admin' }: { participantIds: string[]; hostId?: string; hostLabel?: string }) {
  const styles = useThemedStyles(baseStyles);

  const { profile } = useLocalProfile();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}
      contentContainerStyle={styles.row} accessibilityLabel="Participants">
      {participantIds.map(id => {
        const account = getMockAccount(id);
        if (!account) return null;
        const participant = id === 'self' ? profile : account;
        const isHost = id === hostId;
        return (
          <Pressable key={id} accessibilityRole="button" accessibilityLabel={`View ${participant.displayName}${id === 'self' ? ', your profile' : "'s profile"}${isHost ? `, ${hostLabel}` : ""}`}
            onPress={() => router.push(id === 'self' ? '/profile' : { pathname: '/profile', params: { userId: id } })}
            style={styles.participant}>
            <View style={[styles.avatarFrame, { backgroundColor: account.avatarColor }, isHost && styles.hostAvatar]}>
            {participant.avatarUri || id === 'self' ? <Image source={participant.avatarUri ? { uri: participant.avatarUri } : require('../../../../assets/avatars/cuevo-mascot.png')} style={styles.photo} accessible={false} />
              : <Text style={styles.initial}>{participant.displayName.charAt(0)}</Text>}
            </View>
            {isHost && <View style={styles.adminBadge} accessible={false}>
              <Ionicons name="shield-checkmark" size={12} color="#604000" />
            </View>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const baseStyles = StyleSheet.create({
  scroll: { flex: 1 },
  row: { alignItems: 'center', gap: 3, paddingVertical: 8, paddingRight: 20 },
  participant: { width: 50, height: 50 },
  hostAvatar: { borderColor: '#F5C542', borderWidth: 2 },
  adminBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 5, backgroundColor: '#F5C542', borderWidth: 1, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarFrame: { width: 50, height: 50, borderRadius: 16, borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0E8' },
  photo: { width: '100%', height: '100%' },
  initial: { fontFamily: fonts.semibold, fontSize: 19, color: colors.text },
});
