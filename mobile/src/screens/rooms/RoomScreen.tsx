import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { BlurTargetView } from 'expo-blur';
import { useRef, useState, type ComponentRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMockAccount } from '../../data/mockAccounts';
import InvitePeopleModal from '../../components/InvitePeopleModal';
import SongPickerModal from '../../components/SongPickerModal';
import { getSong } from '../../data/songs';
import TabBarBackdrop from '../../components/navigation/TabBarBackdrop';
import { useMockRooms, type RoomRole } from '../../state/MockRoomsContext';
import { useLocalProfile } from '../../state/ProfileContext';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import RoomQueue from './components/RoomQueue';
import { queueSongId, rankedTracks } from '../../state/roomQueue';
import RoomParticipants from './components/RoomParticipants';
import RoomTabs, { type RoomTab } from './components/RoomTabs';
import RoomActivity, { type RoomActivityEvent } from './components/RoomActivity';
import RoomHeaderCard, { type RoomHeaderDetails } from './components/RoomHeaderCard';

type Role = RoomRole;
const roomDetails: Record<string, RoomHeaderDetails & { role: Role; trackIndex: number }> = {
  'kitchen-disco': { name: 'Kitchen Disco', host: 'You', genres: 'Disco · Pop', participants: 12, role: 'host', trackIndex: 0 },
  'late-nights': { name: 'Late Nights', host: 'Sara', genres: 'R&B · Soul', participants: 8, role: 'participant', trackIndex: 4 },
  'on-repeat': { name: 'On Repeat', host: 'Amine', genres: 'Pop · Indie', participants: 24, role: 'visitor', trackIndex: 3 },
};

export default function RoomScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { rooms } = useMockRooms();
  if (!rooms[id]) return <SafeAreaView style={styles.screen}><Pressable onPress={() => router.replace('/rooms')} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to rooms"><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><Text style={styles.hostTitle}>Room unavailable</Text></SafeAreaView>;
  return <RoomPreview key={id} id={id} />;
}

function RoomPreview({ id }: { id: string }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const insets = useSafeAreaInsets();
  const { profile } = useLocalProfile();
  const initialRoom = roomDetails[id] ?? { name: 'Music room', host: 'Host', genres: 'Music · Together', participants: 0, role: 'visitor' as Role, trackIndex: 0 };
  const { rooms, setJoined, updateQueue } = useMockRooms();
  const membership = rooms[id];
  const role = membership?.role ?? 'visitor';
  const isCreatedRoom = !!membership?.name;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const playback = membership.playback;
  const { isPlaying, ended, currentId } = playback;
  const tracks = rankedTracks(playback);
  const participantIds = membership?.participantIds ?? [];
  const host = membership?.hostId === 'self' ? profile.displayName : getMockAccount(membership?.hostId ?? '')?.displayName ?? initialRoom.host;
  const room = { ...initialRoom, name: membership?.name ?? initialRoom.name, genres: membership.genre ?? initialRoom.genres, visibility: membership.visibility ?? 'public', host, participants: participantIds.length };
  const [selectedTab, setSelectedTab] = useState<RoomTab>('queue');
  const eventId = useRef(1);
  const [activity, setActivity] = useState<RoomActivityEvent[]>(() => [{
    id: 0, message: ended ? 'This room has ended' : isCreatedRoom ? `${profile.displayName} created the room` : `Room opened`, timestamp: Date.now(), icon: 'musical-notes',
  }]);
  const showActivity = role !== 'visitor' && selectedTab === 'activity';

  function addActivity(message: string, icon: RoomActivityEvent['icon']) {
    const event = { id: eventId.current++, message, timestamp: Date.now(), icon };
    setActivity(current => [event, ...current].slice(0, 60));
  }

  function changeMembership(joined: boolean) {
    setJoined(id, joined);
    showToast(joined ? 'success' : 'info', joined ? 'Joined room' : 'Left room', room.name);
    setSelectedTab('queue');
    addActivity(`${profile.displayName} ${joined ? 'joined the party' : 'left the party'}`, joined ? 'person-add' : 'exit');
  }

  function togglePlayback() {
    if (!tracks.length || ended || role !== 'host') return;
    updateQueue(id, { type: 'toggle' });
    addActivity(`${profile.displayName} ${isPlaying ? 'paused' : 'started'} playback`, isPlaying ? 'pause' : 'play');
  }
  function nextSong() {
    if (!currentId || ended || role !== 'host') return;
    updateQueue(id, { type: 'next' });
    addActivity(tracks.length > 1 ? `${profile.displayName} advanced to “${tracks[1].title}”` : 'Queue finished. The room stays open for more songs.', 'play-skip-forward');
  }
  function removeSong(trackId: string) {
    const track = tracks.find(track => track.id === trackId);
    if (!track || ended || role !== 'host') return;
    Alert.alert('Remove song?', track.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        updateQueue(id, { type: 'remove', id: trackId });
        addActivity(`${profile.displayName} removed “${track.title}”`, 'trash');
        showToast('info', 'Song removed', track.title);
      } },
    ]);
  }
  function endRoom() {
    Alert.alert('End this room?', 'The room will stay available to view. Joining, suggestions, voting and playback will close.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End room', style: 'destructive', onPress: () => {
        updateQueue(id, { type: 'end' });
        addActivity(`${profile.displayName} ended the room`, 'stop-circle');
        showToast('info', 'Room ended', 'You can still view this room.');
      } },
    ]);
  }
  const suggest = () => {
    if (!ended && role !== 'visitor') setSuggestOpen(true);
  };
  function suggestSong(songId: string) {
    if (ended || role === 'visitor' || tracks.some(track => queueSongId(track) === songId)) return;
    const song = getSong(songId);
    if (!song) return;
    updateQueue(id, { type: 'suggest', songId, addedBy: profile.displayName });
    addActivity(`${profile.displayName} suggested “${song.title}”`, 'add-circle');
    showToast('success', 'Song added to queue', song.title);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <StatusBar style={colors.dark ? 'light' : 'dark'} />
      <BlurTargetView ref={blurTarget} style={styles.body}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: 44, paddingBottom: Math.max(insets.bottom, 16) + 90 }]}>
      <RoomHeaderCard room={room} playback={playback} isHost={role === 'host'} onToggle={togglePlayback} onNext={nextSong} onSeek={seconds => { if (!ended && role === 'host') updateQueue(id, { type: 'seek', seconds }); }} />
      {ended && <Text style={styles.playbackNote}>This room has ended. You can still view its queue and participants.</Text>}
      {!ended && !currentId && <Text style={styles.playbackNote}>Waiting for the host to start playback.</Text>}
      <View style={styles.participants}>
        <View style={styles.participantsHeading}>
          <Text accessibilityRole="header" style={styles.participantsTitle}>Participants</Text>
          {!ended && role !== 'visitor' && <Pressable onPress={() => setInviteOpen(true)} accessibilityRole="button" accessibilityLabel="Invite people to room" style={styles.invite}>
            <Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.inviteLabel}>Invite</Text>
          </Pressable>}
        </View>
        <View style={styles.participantsRow}><RoomParticipants participantIds={participantIds} hostId={membership?.hostId} /></View>
      </View>
      {role !== 'host' && <Text style={styles.playbackNote}>Playback on {host}’s device</Text>}
      {role !== 'visitor' && <RoomTabs selected={selectedTab} onSelect={setSelectedTab} />}
      <View style={showActivity ? styles.hidden : undefined}>
        <RoomQueue tracks={tracks} currentId={currentId} ended={ended} canVote={!ended && role !== 'visitor'} onVote={(trackId, vote) => updateQueue(id, { type: 'vote', id: trackId, vote })} onRemove={!ended && role === 'host' ? removeSong : undefined} onSuggest={!ended && role !== 'visitor' ? suggest : undefined} isPlaying={isPlaying} />
      </View>
      {showActivity && <RoomActivity events={activity} />}
      </ScrollView>
      </BlurTargetView>
      <View style={[styles.header, { top: insets.top }]}>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}
        accessibilityRole="button" accessibilityLabel="Back to Home" style={styles.back}>
        <Ionicons name="arrow-back" size={24} color={colors.text} accessible={false} />
      </Pressable>
        <View style={styles.roomTitleRow}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.roomTitle}>{room.name}</Text>
          {room.visibility === 'private' && <Ionicons name="lock-closed" size={15} color={colors.textSecondary} accessibilityLabel="Private room" />}
        </View>
        {!ended && role === 'host' && <Pressable accessibilityRole="button" onPress={endRoom} style={styles.leave}><Text style={styles.leaveLabel}>End room</Text></Pressable>}
        {!ended && role === 'participant' && <Pressable accessibilityRole="button" onPress={() => changeMembership(false)} style={styles.leave}><Text style={styles.leaveLabel}>Leave</Text></Pressable>}
      </View>
      <SongPickerModal visible={suggestOpen && !ended && role !== 'visitor'} onClose={() => setSuggestOpen(false)} title="Suggest a song" songIds={tracks.map(queueSongId)} onAdd={suggestSong} />
      <InvitePeopleModal visible={inviteOpen} onClose={() => setInviteOpen(false)} memberIds={participantIds} title="Invite to room" />
      <TabBarBackdrop height={Math.max(insets.bottom, 16) + 110} blurTarget={blurTarget} />
      {!ended && role === 'visitor' && <Pressable
        accessibilityRole="button"
        accessibilityLabel="Join room"
        onPress={() => changeMembership(true)}
        style={({ pressed }) => [styles.joinButton, { bottom: Math.max(insets.bottom, 16) }, pressed && styles.joinPressed]}>
        <Text style={styles.joinLabel}>Join room</Text>
        <Ionicons name="arrow-forward" size={21} color="#FFFFFF" accessible={false} />
      </Pressable>}

    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  hidden: { display: 'none' },
  roomTitleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomTitle: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.text },
  leave: { padding: 12, marginRight: 8 },
  leaveLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  playbackNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, marginLeft: 6, marginTop: 14 },
  hostTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  screen: { flex: 1, backgroundColor: '#FFFCF8' },
  body: { flex: 1, paddingLeft: 12 },
  content: { paddingBottom: 24 },
  header: { backgroundColor: '#FFFCF8', position: 'absolute', left: 0, right: 0, zIndex: 2, minHeight: 44, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  participants: { marginTop: 24, paddingLeft: 6, gap: 8 },
  participantsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 18 },
  invite: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12 },
  inviteLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  participantsTitle: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.text },
  participantsRow: { height: 66 },
  joinButton: { position: 'absolute', left: 20, right: 20, minHeight: 58, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, backgroundImage: 'linear-gradient(135deg, #FF8A50 0%, #FF4D24 80%)', borderWidth: 1, borderColor: '#FFA573', boxShadow: '0px 6px 18px rgba(255,77,36,0.18)' },
  joinLabel: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: '#FFFFFF' },
  joinPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
