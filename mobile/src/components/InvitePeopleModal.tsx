import AccountBadges from './AccountBadges';
import SearchPickerModal from './SearchPickerModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mockAccounts } from '../data/mockAccounts';
import { colors } from '../theme/colors';
import { showToast } from '../utils/toast';
import { fonts } from '../theme/fonts';

export default function InvitePeopleModal({ visible, onClose, memberIds, title }: {
  visible: boolean; onClose: () => void; memberIds: string[]; title: string;
}) {
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  return <SearchPickerModal visible={visible} onClose={onClose} title={title} placeholder="Search people by name or username">
    {query => {
      const people = mockAccounts.filter(account => account.id !== 'self' && !memberIds.includes(account.id) && `${account.displayName} ${account.username}`.toLocaleLowerCase().includes(query));
      return <>
          {people.map(person => {
            const invited = invitedIds.includes(person.id);
            return <View key={person.id} style={styles.person}>
              <View style={[styles.avatar, { backgroundColor: person.avatarColor }]}><Text style={styles.initial}>{person.displayName.charAt(0)}</Text></View>
              <View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{person.displayName}</Text><AccountBadges verified={person.verified} subscriptionActive={person.subscriptionActive} size={16} /></View>
              <Pressable onPress={() => {
                  setInvitedIds(current => invited ? current.filter(id => id !== person.id) : [...current, person.id]);
                  showToast(invited ? 'info' : 'success', invited ? 'Invitation canceled' : 'Invitation sent', person.displayName);
                }}
                accessibilityRole="button" accessibilityLabel={`${invited ? 'Cancel invitation for' : 'Invite'} ${person.displayName}`} style={styles.invite}>
                <Ionicons name={invited ? 'checkmark' : 'add'} size={17} color={colors.primary} />
                <Text style={styles.inviteLabel}>{invited ? 'Invited' : 'Invite'}</Text>
              </Pressable>
            </View>;
          })}
          {people.length === 0 && <Text style={styles.note}>No people found. Try another name or username.</Text>}
      </>;
    }}
  </SearchPickerModal>;
}
const styles = StyleSheet.create({
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.textSecondary, marginVertical: 12 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  avatar: { width: 46, height: 46, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  nameRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  invite: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  inviteLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
});
