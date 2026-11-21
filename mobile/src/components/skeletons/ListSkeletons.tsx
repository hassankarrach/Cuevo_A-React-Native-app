import { StyleSheet, View } from 'react-native';
import { PlaylistCardSkeleton, RoomCardSkeleton, SkeletonPulse } from './CardSkeletons';

export function RoomGridSkeleton() {
  return <SkeletonPulse label="Loading rooms"><View style={styles.grid}>
    {[0, 1, 2, 3, 4, 5].map(index => <RoomCardSkeleton grid key={index} />)}
  </View></SkeletonPulse>;
}

export function PlaylistListSkeleton() {
  return <SkeletonPulse label="Loading playlists"><View style={styles.list}>
    {[0, 1, 2, 3].map(index => <PlaylistCardSkeleton key={index} />)}
  </View></SkeletonPulse>;
}
const styles = StyleSheet.create({
  grid: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  list: { gap: 14 },
});
