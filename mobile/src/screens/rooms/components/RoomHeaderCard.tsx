import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAppColors } from '../../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSong } from '../../../data/songs';
import { playbackDuration, queueSongId, rankedTracks, type Playback } from '../../../state/roomQueue';
import { fonts } from '../../../theme/fonts';
import RoomRecord from './RoomRecord';
import RoomHeaderBackground from './RoomHeaderBackground';

export type RoomHeaderDetails = { name: string; host: string; genres: string; participants: number; visibility?: 'public' | 'private' };
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

type Props = { room: RoomHeaderDetails; playback: Playback; isHost: boolean; onToggle: () => void; onNext: () => void; onSeek: (seconds: number) => void };
export default function RoomHeaderCard({ room, playback, isHost, onToggle, onNext, onSeek }: Props) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const [progressWidth, setProgressWidth] = useState(0);
  const track = playback.tracks.find(item => item.id === playback.currentId) ?? rankedTracks(playback)[0];
  const songId = track ? queueSongId(track) : undefined;
  const song = songId ? getSong(songId) : undefined;
  const duration = playbackDuration(track?.duration);
  const elapsed = playback.currentId ? Math.min(playback.elapsed, duration) : 0;
  const progress = duration ? elapsed / duration : 0;
  const canControl = isHost && !playback.ended;
  const canSeek = canControl && !!playback.currentId && duration > 0;
  const status = playback.ended ? 'Room ended' : !track ? 'Queue is empty' : !playback.currentId ? 'Ready to play' : playback.isPlaying ? 'Now playing' : 'Paused';
  return <View style={styles.card}>
    <RoomHeaderBackground />
    <Text numberOfLines={1} style={styles.roomMeta}>Hosted by {room.host} · {room.genres}</Text>
    <View style={styles.nowPlaying}>
      <Pressable style={styles.songInfo} disabled={!songId} accessibilityRole="button" accessibilityLabel={track ? `Open ${track.title} by ${track.artist}` : 'No song queued'} onPress={() => { if (songId) router.push({ pathname: '/song/[id]', params: { id: songId } }); }}>
        <Text style={styles.status}>{status}</Text>
        <Text numberOfLines={2} style={styles.songTitle}>{track?.title ?? 'Make room for music.'}</Text>
        <Text numberOfLines={2} style={styles.artist}>{track?.artist ?? 'Suggest a song to get started'}</Text>
      </Pressable>
      <RoomRecord cover={song?.cover} playing={playback.isPlaying && !!playback.currentId && !playback.ended} tint={track?.tint ?? colors.primary} />
    </View>
    <View style={styles.controls}>
      <Text style={styles.controlNote}>{playback.ended ? 'Playback ended' : isHost ? 'Playing on your device' : `${room.host} controls playback`}</Text>
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" accessibilityLabel="Restart song" disabled={!canSeek} onPress={() => onSeek(0)} style={[styles.smallButton, !canSeek && styles.disabled]}><Ionicons name="refresh" size={21} color="#FFFFFF" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={playback.isPlaying ? 'Pause playback' : 'Start playback'} disabled={!canControl || !track} onPress={onToggle} style={[styles.playButton, (!canControl || !track) && styles.disabled]}><Ionicons name={playback.isPlaying ? 'pause' : 'play'} size={23} color={colors.primary} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next song" disabled={!canControl || !playback.currentId} onPress={onNext} style={[styles.smallButton, (!canControl || !playback.currentId) && styles.disabled]}><Ionicons name="play-skip-forward" size={21} color="#FFFFFF" /></Pressable>
      </View>
    </View>
    <Pressable style={styles.seekTarget} disabled={!canSeek} accessibilityRole={canSeek ? 'adjustable' : 'progressbar'} accessibilityLabel="Song progress" accessibilityState={{ disabled: !canSeek }} accessibilityValue={{ min: 0, max: duration, now: elapsed, text: `${time(elapsed)} of ${time(duration)}` }} accessibilityActions={canSeek ? [{ name: 'increment', label: 'Forward ten seconds' }, { name: 'decrement', label: 'Back ten seconds' }] : []} onAccessibilityAction={event => { if (canSeek) onSeek(elapsed + (event.nativeEvent.actionName === 'increment' ? 10 : -10)); }} onLayout={event => setProgressWidth(event.nativeEvent.layout.width)} onPress={event => { if (canSeek && progressWidth) onSeek(event.nativeEvent.locationX / progressWidth * duration); }}>
      <View pointerEvents="none" style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      <View pointerEvents="none" style={[styles.progressDot, { left: `${progress * 100}%` }]} />
    </Pressable>
    <View style={styles.times}><Text style={styles.time}>{time(elapsed)}</Text><Text style={styles.time}>{time(duration)}</Text></View>
  </View>;
}
const baseStyles = StyleSheet.create({
  card: { marginLeft: 6, marginRight: 18, marginTop: 20, padding: 18, borderRadius: 26, borderWidth: 1, borderColor: '#EEEAE4', backgroundColor: '#FFFFFF' },
  roomMeta: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, color: '#FFFFFF', marginTop: 3 },
  nowPlaying: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 8 },
  songInfo: { flex: 1, minWidth: 0, minHeight: 90, justifyContent: 'center' },
  status: { fontFamily: fonts.medium, fontSize: 10, color: '#FFFFFF', marginBottom: 10 },
  songTitle: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 28, letterSpacing: -0.6, color: '#FFFFFF' },
  artist: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: '#FFFFFF', marginTop: 6 },
  seekTarget: { marginTop: 12, height: 28, justifyContent: 'center' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 2 },
  progressDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, marginLeft: -5, backgroundColor: '#FFFFFF' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontFamily: fonts.medium, fontSize: 10, color: '#FFFFFF' },
  controls: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  controlNote: { flex: 1, minWidth: 90, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, color: '#FFFFFF' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  disabled: { opacity: 0.35 },
});
