import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { getMockAccount } from '../../../data/mockAccounts';
import { useLocalProfile } from '../../../state/ProfileContext';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';
import LiveIndicator from './LiveIndicator';

type RoomListenersProps = { total: number; avatars?: ImageSourcePropType[]; participantIds?: string[] };
const placeholderColors = ['#FFE1CD', '#E9E3D9', '#F6DFA5'];

export default function RoomListeners({ total, avatars = [], participantIds = [] }: RoomListenersProps) {
  const { profile } = useLocalProfile();
  const visibleCount = Math.min(3, Math.max(0, total));
  const remaining = Math.max(0, total - visibleCount);
  return (
    <View style={styles.row} accessibilityLabel={`${total} listeners, live`}>
      <View style={styles.stack} accessible={false}>
        {Array.from({ length: visibleCount }, (_, index) => {
          const id = participantIds[index];
          const account = getMockAccount(id);
          const person = id === 'self' ? profile : account;
          const photo = person?.avatarUri ? { uri: person.avatarUri } : id === 'self' ? require('../../../../assets/avatars/cuevo-mascot.png') : avatars[index];
          return <View key={id ?? index} style={[styles.avatar, { backgroundColor: account?.avatarColor ?? placeholderColors[index] }, index > 0 && styles.overlap]}>
            {photo ? <Image source={photo} style={styles.photo} /> : person ? <Text style={styles.remainingText}>{person.displayName.charAt(0)}</Text> : <Ionicons name="person" size={13} color={colors.textSecondary} accessible={false} />}
          </View>;
        })}
        {remaining > 0 && <View style={[styles.remaining, styles.overlap]}>
          <Text style={styles.remainingText}>+{remaining}</Text>
        </View>}
      </View>
      <LiveIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', minHeight: 26 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  overlap: { marginLeft: -7 },
  remaining: { minWidth: 30, height: 25, paddingHorizontal: 4, borderRadius: 13, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#F1EEEA', alignItems: 'center', justifyContent: 'center' },
  remainingText: { fontFamily: fonts.semibold, fontSize: 9, color: colors.textSecondary },
});
