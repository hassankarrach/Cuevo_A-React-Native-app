import { useThemedStyles } from '../../../theme/useThemedStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, View } from 'react-native';
import { getSong } from '../../../data/songs';

export default function PlaylistCover({ songIds, size = 76, fill = false }: { songIds: string[]; size?: number; fill?: boolean }) {
  const styles = useThemedStyles(baseStyles);

  const covers = songIds.slice(0, 4).map(getSong).filter(song => !!song);
  return <View style={[styles.cover, { width: size, height: size, borderRadius: size * 0.19 }, fill && styles.fill]} accessible={false}>
    {covers.length === 0 ? <Ionicons name="albums" size={size * 0.4} color="#FFF8EC" />
      : covers.length < 4 ? <Image source={covers[0].cover} style={styles.full} />
      : covers.map(song => <Image key={song.id} source={song.cover} style={styles.quarter} />)}
  </View>;
}
const baseStyles = StyleSheet.create({
  cover: { backgroundColor: '#FF8A50', overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  fill: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', borderRadius: 0 },
  full: { width: '100%', height: '100%' },
  quarter: { width: '50%', height: '50%' },
});
