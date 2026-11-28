import { StyleSheet, Text, View } from 'react-native';
import type { Playlist } from '../../../data/mockPlaylists';
import { getSong } from '../../../data/songs';
import { getPlaylistTheme } from '../../../theme/playlistThemes';
import { fonts } from '../../../theme/fonts';
import PlaylistCover from './PlaylistCover';
import PlaylistHeaderBackground from './PlaylistHeaderBackground';

export default function PlaylistHeader({ playlist, creator }: { playlist: Playlist; creator: string }) {
  const styles = baseStyles;
  const { palette } = getPlaylistTheme(playlist.songIds);

  const minutes = Math.round(playlist.songIds.reduce((total, id) => total + (getSong(id)?.durationMs ?? 0), 0) / 60000);
  return <View style={[styles.card, { backgroundColor: palette.base }]}>
    <PlaylistHeaderBackground palette={palette} />
    <View style={styles.art}><PlaylistCover songIds={playlist.songIds} size={176} fill /></View>
    <View style={styles.content}>
      <Text accessibilityRole="header" style={styles.name}>{playlist.name}</Text>
      <Text style={styles.count}>{playlist.songIds.length} songs · {minutes} min</Text>
      <Text numberOfLines={1} style={styles.creator}>by {creator}</Text>
    </View>
  </View>;
}
const baseStyles = StyleSheet.create({
  card: { minHeight: 180, marginTop: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#073430', flexDirection: 'row', alignItems: 'center', padding: 2, paddingRight: 18, gap: 12 },
  content: { flex: 1, minWidth: 0, zIndex: 1, alignItems: 'flex-start', alignSelf: 'stretch', justifyContent: 'center', paddingTop: 16, paddingBottom: 44 },
  name: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, color: '#FFFFFF', alignSelf: 'stretch', marginLeft: -24, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  creator: { position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'right', fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: '#F2EDE7' },
  count: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 17, color: '#FFFFFF', marginTop: 5 },
  art: { width: '44%', alignSelf: 'stretch', borderRadius: 22, overflow: 'hidden' },
});
