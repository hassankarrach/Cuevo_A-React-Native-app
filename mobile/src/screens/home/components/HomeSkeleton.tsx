import { useAppColors, type AppColors } from '../../../theme/useAppColors';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PlaylistCardSkeleton, RoomCardSkeleton, SkeletonPulse } from '../../../components/skeletons/CardSkeletons';

function SectionHeading() {
  const styles = makeStyles(useAppColors());
  return <View style={styles.heading}><View style={styles.headingBone} /><View style={styles.linkBone} /></View>;
}

export default function HomeSkeleton() {
  const styles = makeStyles(useAppColors());
  return <SkeletonPulse>
    <View style={styles.section}>
      <SectionHeading />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} contentContainerStyle={styles.rooms}>
        {[0, 1, 2].map(index => <RoomCardSkeleton key={index} />)}
      </ScrollView>
    </View>
    <View style={styles.section}>
      <SectionHeading />
      <View style={styles.playlists}>{[0, 1, 2, 3].map(index => <PlaylistCardSkeleton key={index} />)}</View>
    </View>
  </SkeletonPulse>;
}
const makeStyles = (colors: AppColors) => StyleSheet.create({
  section: { marginTop: 24, gap: 8 },
  heading: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingBone: { width: 100, height: 21, borderRadius: 6, backgroundColor: colors.skeleton },
  linkBone: { width: 46, height: 12, borderRadius: 5, backgroundColor: colors.skeleton },
  carousel: { marginHorizontal: -20 },
  rooms: { gap: 12, paddingHorizontal: 20, paddingVertical: 4 },
  playlists: { gap: 12 },
});
