import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getMockAccount } from '../../../data/mockAccounts';
import { type Playlist } from '../../../data/mockPlaylists';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';
import PlaylistCover from './PlaylistCover';

const avatarColors = ['#FFE1CD', '#E9E3D9', '#F6DFA5'];

export default function PlaylistCard({ playlist: source }: { playlist: Playlist }) {
  const playlist = {
    ...source,
    creator: source.creatorId === 'self' ? 'You' : getMockAccount(source.creatorId)?.displayName ?? 'Creator',
    tracks: source.songIds.length,
    collaborators: source.collaboratorIds.length,
  };
  return (
    <Pressable style={styles.card} accessibilityRole="button" onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
      accessibilityLabel={`Playlist, ${playlist.name}, by ${playlist.creator}, ${playlist.tracks} tracks, ${playlist.collaborators} collaborators, ${playlist.private ? 'private' : 'public'}.`}>
      {playlist.private && <View style={styles.visibility} pointerEvents="none">
        <Ionicons name="lock-closed" size={18} color={colors.textSecondary} accessible={false} />
      </View>}
      <PlaylistCover songIds={playlist.songIds} />
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.name}>{playlist.name}</Text>
        <Text numberOfLines={1} style={styles.metadata}>By {playlist.creator} · {playlist.tracks} tracks</Text>
        <View style={styles.footer}>
          <View style={styles.avatars}>
            {avatarColors.map((backgroundColor, index) => (
              <View key={backgroundColor} style={[styles.avatar, { backgroundColor }, index > 0 && styles.overlap]}>
                <Ionicons name="person" size={11} color={colors.textSecondary} accessible={false} />
              </View>
            ))}
            {playlist.collaborators > 3 && <View style={[styles.remaining, styles.overlap]}>
              <Text style={styles.remainingText}>+{playlist.collaborators - 3}</Text>
            </View>}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 80, padding: 4, gap: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEAE4' },
  details: { flex: 1, minWidth: 0, gap: 4, paddingRight: 30 },
  name: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.text },
  metadata: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 3 },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  overlap: { marginLeft: -6 },
  remaining: { minWidth: 26, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF', paddingHorizontal: 4, backgroundColor: '#F1EEEA', alignItems: 'center', justifyContent: 'center' },
  remainingText: { fontFamily: fonts.semibold, fontSize: 9, color: colors.textSecondary },
  visibility: { position: 'absolute', top: 10, right: 12 },
});
