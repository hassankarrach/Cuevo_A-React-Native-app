import { useThemedStyles } from '../../../theme/useThemedStyles';
import { StyleSheet, View } from 'react-native';
import { SearchResultSkeleton, SkeletonPulse } from '../../../components/skeletons/CardSkeletons';

export default function SearchResultsSkeleton() {
  const styles = useThemedStyles(baseStyles);

  return <SkeletonPulse label="Searching rooms, playlists, songs and profiles">
    {[0, 1].map(section => <View key={section} style={styles.section}>
      <View style={styles.heading} />
      {[0, 1, 2].map(row => <SearchResultSkeleton key={row} />)}
    </View>)}
  </SkeletonPulse>;
}
const baseStyles = StyleSheet.create({
  section: { marginTop: 12 },
  heading: { width: 94, height: 20, marginBottom: 6, borderRadius: 6, backgroundColor: '#DED8D1' },
});
