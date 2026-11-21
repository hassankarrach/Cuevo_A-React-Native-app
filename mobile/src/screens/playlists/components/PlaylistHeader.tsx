import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import type { Playlist } from '../../../data/mockPlaylists';
import { getSong } from '../../../data/songs';
import { fonts } from '../../../theme/fonts';
import PlaylistCover from './PlaylistCover';

export default function PlaylistHeader({ playlist, creator }: { playlist: Playlist; creator: string }) {
  const minutes = Math.round(playlist.songIds.reduce((total, id) => total + (getSong(id)?.durationMs ?? 0), 0) / 60000);
  return <View style={styles.card}>
    <View pointerEvents="none" style={styles.glow} />
    <View style={styles.content}>
      <View style={styles.status}>{playlist.private && <Ionicons name="lock-closed" size={11} color="#74321F" />}
        <Text style={styles.statusLabel}>{playlist.private ? 'PRIVATE' : 'PUBLIC'} · PLAYLIST</Text></View>
      <Text accessibilityRole="header" style={styles.name}>{playlist.name}</Text>
      <Text style={styles.creator}>Created by {creator}</Text>
      <Text style={styles.count}>{playlist.songIds.length} songs · {minutes} min</Text>
    </View>
    <View style={styles.art}><PlaylistCover songIds={playlist.songIds} size={112} /></View>
  </View>;
}
const styles = StyleSheet.create({
  card: { minHeight: 180, marginTop: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FF7843', backgroundImage: 'linear-gradient(135deg, #FFB373 0%, #FF6A35 65%, #E63F20 100%)', flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  glow: { ...StyleSheet.absoluteFill, backgroundImage: 'radial-gradient(ellipse farthest-corner at 12% 0%, rgba(255,241,214,0.55), rgba(255,241,214,0) 85%)' },
  content: { flex: 1, alignItems: 'flex-start' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 8 },
  statusLabel: { fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 0.7, color: '#74321F' },
  name: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 28, color: '#3B241B', marginBottom: 5 },
  creator: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: '#603224' },
  count: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, color: '#3B241B', marginTop: 5 },
  art: { borderWidth: 3, borderColor: 'rgba(255,248,236,0.65)', borderRadius: 24, overflow: 'hidden' },
});
