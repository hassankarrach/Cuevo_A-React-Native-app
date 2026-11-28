import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAppColors } from '../../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import QueueVote from './QueueVote';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

import type { QueueTrack, Vote } from '../../../state/roomQueue';
import { getSong } from '../../../data/songs';
import { getQueueSong, queueSongId } from '../../../state/roomQueue';

export default function RoomQueue({ tracks, currentId, canVote, onVote, onRemove, onSuggest, isPlaying, ended }: {
  tracks: QueueTrack[]; currentId: string | null; canVote: boolean; onVote: (id: string, vote: Vote) => void; onRemove?: (id: string) => void; onSuggest?: () => void; isPlaying: boolean; ended: boolean;
}) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Up next</Text>
        {onSuggest ? <Pressable onPress={onSuggest} accessibilityRole="button" style={styles.suggest}>
          <Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.suggestLabel}>Suggest</Text>
        </Pressable> : <Text style={styles.preview}>{tracks.length} songs</Text>}
      </View>
      {tracks.length === 0 && <Text style={styles.preview}>{ended ? 'This room has ended.' : 'Queue finished. Suggest a song for the host to play.'}</Text>}
      {tracks.map((track, index) => {
        const playing = track.id === currentId;
        const songId = queueSongId(track);
        const cover = getSong(songId)?.cover ?? getQueueSong(songId)?.cover;
        return (
          <View key={track.id} style={styles.row}>
          <Pressable style={[styles.card, playing && styles.playingCard]} accessibilityRole="button" accessibilityLabel={`Open ${track.title} by ${track.artist}`} onPress={() => router.push({ pathname: '/song/[id]', params: { id: queueSongId(track) } })}>
            <View style={[styles.cover, { backgroundColor: track.tint }]}>
              {cover ? <Image source={cover} resizeMode="cover" style={styles.artwork} accessible={false} /> : <Ionicons name="musical-notes" size={28} color={colors.textSecondary} accessible={false} />}
            </View>
            <View style={styles.details}>
              {playing && <Text style={styles.playingLabel}>{ended ? 'LAST PLAYING' : isPlaying ? 'NOW PLAYING' : 'PAUSED'}</Text>}
              <Text numberOfLines={1} style={styles.song}>{track.title}</Text>
              <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
              <Text numberOfLines={1} style={styles.addedBy}>Added by {track.addedBy}</Text>
            </View>
            <View style={styles.trailing}>
              {playing ? (
                <Ionicons name="musical-notes" size={19} color={colors.primary} accessible={false} />
              ) : <Text style={styles.position}>{String(index).padStart(2, '0')}</Text>}
              <Text style={styles.duration}>{track.duration}</Text>
            </View>
          </Pressable>
          {onRemove && <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${track.title}`} onPress={() => onRemove(track.id)} style={styles.remove}><Ionicons name="trash" size={19} color={colors.textSecondary} /></Pressable>}
          {!playing && <QueueVote score={track.score} vote={track.vote} onVote={vote => onVote(track.id, vote)} song={track.title} disabled={!canVote} />}
          </View>
        );
      })}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  remove: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  suggest: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12 },
  suggestLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  section: { marginTop: 25, marginLeft: 6, marginRight: 18, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  title: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.text },
  preview: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4, paddingRight: 10, borderRadius: 23, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEAE4' },
  playingCard: { backgroundColor: '#FFF0E5', borderColor: '#FFBC95', boxShadow: '0px 4px 14px rgba(255, 106, 53, 0.08)' },
  cover: { width: 76, height: 76, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  artwork: { width: '100%', height: '100%' },
  details: { flex: 1, minWidth: 0, gap: 2 },
  playingLabel: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1, color: '#B93D1B', marginBottom: 1 },
  song: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text },
  artist: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  addedBy: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, color: colors.textSecondary },
  trailing: { alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 32 },
  position: { fontFamily: fonts.medium, fontSize: 13, color: '#A2958D' },
  duration: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary },
});
