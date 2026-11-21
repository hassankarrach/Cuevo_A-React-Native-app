import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getSong } from '../../data/songs';
import { usePlaylists } from '../../state/PlaylistsContext';
import { getQueueSong } from '../../state/roomQueue';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import UtilityPage from '../settings/UtilityPage';

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = getSong(id);
  const { playlists } = usePlaylists();
  const [linkError, setLinkError] = useState('');
  if (!song) {
    const track = getQueueSong(id);
    if (!track) return <UtilityPage title="Song"><Text style={styles.metadata}>Song unavailable.</Text></UtilityPage>;
    return <UtilityPage title="Song">
      <View style={[styles.cover, { backgroundColor: track.tint, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="musical-notes" size={96} color={colors.text} accessible={false} /></View>
      <View style={styles.details}>
        <Text accessibilityRole="header" style={styles.title}>{track.title}</Text>
        <Text style={styles.artist}>{track.artist}</Text>
        <Text style={styles.metadata}>{track.duration}</Text>
      </View>
    </UtilityPage>;
  }
  const containingPlaylists = playlists.filter(playlist => playlist.songIds.includes(song.id));

  async function openSource() {
    if (!song) return;
    try {
      await Linking.openURL(song.source.url);
      setLinkError('');
    } catch {
      setLinkError('Could not open Apple Music. Please try again.');
    }
  }

  return <UtilityPage title="Song">
    <Image source={song.cover} style={styles.cover} accessible accessibilityLabel={`${song.title} artwork`} />
    <View style={styles.details}>
      <Text accessibilityRole="header" style={styles.title}>{song.title}</Text>
      <Text style={styles.artist}>{song.artist}</Text>
      <Text style={styles.metadata}>{song.album}</Text>
      <Text style={styles.metadata}>{song.duration} · {song.releaseDate.slice(0, 4)}</Text>
      <View style={styles.tags}>{song.genres.map(genre => <View key={genre} style={styles.tag}><Text style={styles.tagText}>{genre}</Text></View>)}</View>
    </View>
    <Pressable onPress={openSource} accessibilityRole="link" style={styles.source}>
      <Ionicons name="musical-notes" size={20} color="#FFFFFF" accessible={false} /><Text style={styles.sourceText}>Open in Apple Music</Text>
    </Pressable>
    {!!linkError && <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text>}
    {containingPlaylists.length > 0 && <View style={styles.details}>
      <Text accessibilityRole="header" style={styles.heading}>In these playlists</Text>
      {containingPlaylists.map(playlist => <Pressable key={playlist.id} onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })} accessibilityRole="button" style={styles.playlist}>
        <Ionicons name="albums" size={20} color={colors.textSecondary} accessible={false} /><Text style={styles.playlistName}>{playlist.name}</Text>
      </Pressable>)}
    </View>}
  </UtilityPage>;
}

const styles = StyleSheet.create({
  cover: { width: '100%', maxWidth: 340, aspectRatio: 1, alignSelf: 'center', borderRadius: 24 },
  details: { gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 27, lineHeight: 34, color: colors.text },
  artist: { fontFamily: fonts.medium, fontSize: 18, color: colors.text },
  metadata: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F1EEEA' },
  tagText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  source: { minHeight: 52, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14 },
  sourceText: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFFFFF' },
  error: { fontFamily: fonts.regular, fontSize: 13, color: '#B93D1B' },
  heading: { fontFamily: fonts.semibold, fontSize: 19, color: colors.text, marginTop: 8 },
  playlist: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 8 },
  playlistName: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
});
