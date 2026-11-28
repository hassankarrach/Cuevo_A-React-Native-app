import { useAppColors, type AppColors } from '../../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { discoverRooms, roomGenres, type RoomSort } from '../../../state/roomDiscovery';
import { rankedTracks } from '../../../state/roomQueue';
import { useMockRooms } from '../../../state/MockRoomsContext';
import { fonts } from '../../../theme/fonts';
import RoomListeners from './RoomListeners';
import RoomCardBlur from './RoomCardBlur';
import RoomVinyl, { type RoomGenre } from './RoomVinyl';


const roomPreviews: { id: string; name: string; track: string; artist: string; listeners: number; genre: RoomGenre; gradient: string; blurColors: readonly [string, string, string] }[] = [
  { id: 'kitchen-disco', name: 'Kitchen Disco', genre: 'disco', blurColors: ['#FFB86B', '#FF6A36', '#D83B25'], track: 'Levitating', artist: 'Dua Lipa', listeners: 12, gradient: 'linear-gradient(145deg, #FFB86B 0%, #FF6A36 45%, #D83B25 100%)' },
  { id: 'late-nights', name: 'Late Nights', genre: 'rnb', blurColors: ['#C3C9F5', '#797FBD', '#3C466F'], track: 'Pink + White', artist: 'Frank Ocean', listeners: 8, gradient: 'linear-gradient(145deg, #C3C9F5 0%, #797FBD 45%, #3C466F 100%)' },
  { id: 'on-repeat', name: 'On Repeat', genre: 'pop', blurColors: ['#FFE69A', '#E9AD47', '#B67530'], track: 'Golden', artist: 'Harry Styles', listeners: 24, gradient: 'linear-gradient(145deg, #FFE69A 0%, #E9AD47 45%, #B67530 100%)' },
];

export default function HomeRooms({ grid = false, query = '', genre = 'all', sort = 'default' }: { grid?: boolean; query?: string; genre?: string; sort?: RoomSort }) {
  const colors = useAppColors();
  const styles = makeStyles(colors);
  const { rooms } = useMockRooms();
  // Home intentionally lists rooms of both visibility types.
  const createdRooms = Object.entries(rooms).filter(([, room]) => room.name).map(([id, room]) => ({ id, name: room.name!, track: 'No songs yet', artist: 'Suggest the first song', listeners: room.participantIds.length, genre: 'pop' as RoomGenre, gradient: roomPreviews[0].gradient, blurColors: roomPreviews[0].blurColors }));
  const sampleRooms = discoverRooms([...createdRooms, ...roomPreviews].map(room => {
    const state = rooms[room.id].playback;
    const track = state.tracks.find(track => track.id === state.currentId) ?? rankedTracks(state)[0];
    return { ...room, genres: roomGenres(room.id, rooms[room.id].genre), track: track?.title ?? 'No songs yet', artist: track?.artist ?? 'Suggest the first song', listeners: rooms[room.id].participantIds.length };
  }), query, genre, sort);
  const Container = grid ? View : ScrollView;
  return (
    <View style={grid ? styles.gridSection : styles.section}>
      {!grid && <View style={styles.header}>
        <View style={styles.headingRow}>
          <Text accessibilityRole="header" style={styles.title}>Rooms</Text>
        </View>
        <Pressable onPress={() => router.navigate('/rooms')} accessibilityRole="button"
          accessibilityLabel="View all rooms" style={styles.viewAll}>
          <Text style={styles.viewAllLabel}>View all</Text>
        </Pressable>
      </View>}
      {sampleRooms.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>No rooms found</Text><Text style={styles.emptyCopy}>Try another search or change your filters.</Text></View>}
      <Container {...(grid ? { style: styles.grid } : { horizontal: true, showsHorizontalScrollIndicator: false, style: styles.carousel, contentContainerStyle: styles.cards })}>
        {sampleRooms.map((room) => (
          <Pressable key={room.id} style={[styles.card, grid && styles.gridCard]} accessibilityRole="button"
            onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
            accessibilityLabel={`Room, ${rooms[room.id].playback.ended ? 'Ended' : rooms[room.id]?.role === 'participant' ? 'Joined' : rooms[room.id]?.role === 'host' ? 'Host' : 'Visitor'}, ${room.name}, ${rooms[room.id].visibility === 'private' ? 'private' : 'public'}. Playing ${room.track} by ${room.artist}. ${room.listeners} listening.`}>
            <View style={[styles.banner, { backgroundImage: room.gradient }]}>
              <View style={styles.glow} />
              <View style={styles.roomTitleRow}>
                <Text numberOfLines={2} style={styles.roomName}>{room.name}</Text>
                {rooms[room.id].visibility === 'private' && <Ionicons name="lock-closed" size={14} color="#FFF8EC" accessible={false} />}
              </View>
            </View>
            <View style={styles.details}>
              <RoomCardBlur colors={room.blurColors} />
              <View style={styles.trackInfo}>
                <RoomVinyl genre={room.genre} />
                <View style={styles.trackText}>
                  <Text numberOfLines={1} style={styles.track}>{room.track}</Text>
                  <Text numberOfLines={1} style={styles.artist}>{room.artist}</Text>
                </View>
              </View>
              <RoomListeners total={room.listeners} participantIds={rooms[room.id]?.participantIds} />
            </View>
          </Pressable>
        ))}
      </Container>
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  empty: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  emptyCopy: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  gridSection: { marginTop: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  gridCard: { width: '48%' },
  section: { marginTop: 24, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.text },
  viewAll: { minHeight: 44, justifyContent: 'center', paddingLeft: 16 },
  viewAllLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  carousel: { marginHorizontal: -20 },
  cards: { gap: 12, paddingHorizontal: 20, paddingVertical: 4 },
  card: { width: 164, height: 164, padding: 2, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, boxShadow: '0px 3px 10px rgba(71, 43, 26, 0.035)' },
  banner: { height: 57, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  glow: { ...StyleSheet.absoluteFill, backgroundImage: 'radial-gradient(ellipse farthest-corner at 25% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 75%)' },
  details: { flex: 1, paddingHorizontal: 4, paddingTop: 7, paddingBottom: 3 },
  roomTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10 },
  roomName: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: '#FFF8EC', textAlign: 'center' },
  trackInfo: { marginTop: -2, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  trackText: { flex: 1, minWidth: 0 },
  track: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.text },
  artist: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
});
