import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurTargetView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { canEditPlaylistSongs, playlistEditPolicy } from '../../data/mockPlaylists';
import EditPlaylistModal from './components/EditPlaylistModal';
import InvitePeopleModal from '../../components/InvitePeopleModal';
import TabBarBackdrop from '../../components/navigation/TabBarBackdrop';
import { getMockAccount } from '../../data/mockAccounts';
import { getSong, type Song } from '../../data/songs';
import { useLocalProfile } from '../../state/ProfileContext';
import { usePlaylists } from '../../state/PlaylistsContext';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import RoomParticipants from '../rooms/components/RoomParticipants';
import AddSongsModal from './components/AddSongsModal';
import PlaylistHeader from './components/PlaylistHeader';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaylistContent key={id} id={id} />;
}
function PlaylistContent({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const { playlists, editPlaylist, addSong, removeSong, moveSong } = usePlaylists();
  const { profile } = useLocalProfile();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const playlist = playlists.find(item => item.id === id);
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/playlists');
  if (!playlist) return <SafeAreaView style={styles.screen}><Pressable onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><Text style={styles.sectionTitle}>Playlist unavailable</Text></SafeAreaView>;
  const tracks = playlist.songIds.map(getSong).filter((song): song is Song => !!song);
  const creator = playlist.creatorId === 'self' ? profile.displayName : getMockAccount(playlist.creatorId)?.displayName ?? 'Creator';
  const canEdit = canEditPlaylistSongs(playlist);
  const isOwner = playlist.creatorId === 'self';
  const policy = playlistEditPolicy(playlist);
  function showSongActions(song: Song, index: number) {
    Alert.alert(song.title, 'Edit playlist', [
      ...(index > 0 ? [{ text: 'Move up', onPress: () => moveSong(id, song.id, -1) }] : []),
      ...(index < tracks.length - 1 ? [{ text: 'Move down', onPress: () => moveSong(id, song.id, 1) }] : []),
      { text: 'Remove from playlist', style: 'destructive', onPress: () => { removeSong(id, song.id); showToast('info', 'Song removed from playlist', song.title); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <StatusBar style="dark" />
    <BlurTargetView ref={blurTarget} style={styles.body}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 35 }]}>
        <PlaylistHeader playlist={playlist} creator={creator} />
        <Text style={styles.description}>{playlist.description}</Text>
        <View style={styles.sectionHeading}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Collaborators</Text>
          {canEdit && <Pressable onPress={() => setInviteOpen(true)} accessibilityRole="button" accessibilityLabel="Invite collaborators" style={styles.action}><Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.actionLabel}>Invite</Text></Pressable>}
        </View>
        <View style={styles.participants}><RoomParticipants participantIds={playlist.collaboratorIds} /></View>
        <Text style={styles.permission}>{policy === 'owner' ? 'Only the creator can edit songs' : policy === 'collaborators' ? 'Invited collaborators can edit songs' : 'Everyone can edit songs'}</Text>
        <View style={[styles.sectionHeading, styles.songsHeading]}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Songs</Text>
          {canEdit && <Pressable onPress={() => setAddOpen(true)} accessibilityRole="button" style={styles.action}><Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.actionLabel}>Add songs</Text></Pressable>}
        </View>
        {tracks.map((song, index) => <View key={song.id} style={styles.songRow}>
          <Pressable style={styles.songCard} accessibilityRole="button" accessibilityLabel={`Open ${song.title} by ${song.artist}`} onPress={() => router.push({ pathname: '/song/[id]', params: { id: song.id } })}>
            <Image source={song.cover} style={styles.songCover} accessible={false} />
            <View style={styles.songCopy}><Text numberOfLines={1} style={styles.songTitle}>{song.title}</Text><Text numberOfLines={1} style={styles.artist}>{song.artist}</Text><Text style={styles.duration}>{song.duration}</Text></View>
          </Pressable>
          {canEdit && <Pressable onPress={() => showSongActions(song, index)} accessibilityRole="button" accessibilityLabel={`Options for ${song.title}`} style={styles.more}><Ionicons name="ellipsis-horizontal" size={21} color={colors.textSecondary} /></Pressable>}
        </View>)}
        {tracks.length === 0 && <View style={styles.empty}><Ionicons name="albums" size={36} color={colors.primary} /><Text style={styles.songTitle}>Make room for your favorites.</Text><Text style={styles.artist}>Add a song to start this playlist.</Text></View>}
      </ScrollView>
    </BlurTargetView>
    <View style={[styles.topBar, { top: insets.top }]}>
      <Pressable onPress={goBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to playlists"><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
      <Text style={styles.topLabel}>{isOwner ? 'Your playlist' : 'Shared playlist'}</Text>
      {isOwner && <Pressable onPress={() => setEditOpen(true)} accessibilityRole="button" accessibilityLabel="Edit playlist" style={styles.editButton}><Ionicons name="create" size={20} color={colors.primary} /><Text style={styles.actionLabel}>Edit</Text></Pressable>}
    </View>
    <TabBarBackdrop height={Math.max(insets.bottom, 16) + 35} blurTarget={blurTarget} />
    {editOpen && isOwner && <EditPlaylistModal playlist={playlist} onClose={() => setEditOpen(false)} onSave={details => {
      editPlaylist(id, details);
      setEditOpen(false);
      setTimeout(() => showToast('success', 'Playlist updated', details.name), 500);
    }} />}
    <InvitePeopleModal visible={inviteOpen} onClose={() => setInviteOpen(false)} memberIds={playlist.collaboratorIds} title="Invite collaborators" />
    <AddSongsModal visible={addOpen} onClose={() => setAddOpen(false)} songIds={playlist.songIds} onAdd={songId => addSong(id, songId)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFCF8' },
  body: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 44 },
  topBar: { backgroundColor: '#FFFCF8', position: 'absolute', left: 0, right: 0, minHeight: 44, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, flex: 1 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 16 },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textSecondary, marginTop: 16, marginBottom: 14, paddingHorizontal: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.text },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12 },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  participants: { height: 66 },
  permission: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, marginTop: 8 },
  songsHeading: { marginTop: 24, marginBottom: 8 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  songCard: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 4, paddingRight: 10, borderRadius: 23, borderWidth: 1, borderColor: '#EEEAE4', backgroundColor: '#FFFFFF' },
  songCover: { width: 70, height: 70, borderRadius: 19 },
  songCopy: { flex: 1, minWidth: 0, gap: 4 },
  songTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text },
  artist: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  duration: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
});
