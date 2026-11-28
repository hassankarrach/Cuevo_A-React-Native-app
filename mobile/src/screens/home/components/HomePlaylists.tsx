import { useAppColors, type AppColors } from '../../../theme/useAppColors';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts } from '../../../theme/fonts';
import { usePlaylists } from '../../../state/PlaylistsContext';
import PlaylistCard from '../../playlists/components/PlaylistCard';

export default function HomePlaylists() {
  const colors = useAppColors();
  const styles = makeStyles(colors);
  const { playlists } = usePlaylists();
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headingRow}>
          <Text accessibilityRole="header" style={styles.title}>Playlists</Text>
        </View>
        <Pressable onPress={() => router.navigate('/playlists')} accessibilityRole="button"
          accessibilityLabel="View all playlists" style={styles.viewAll}>
          <Text style={styles.viewAllLabel}>View all</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {playlists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  section: { marginTop: 24, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.text },
  viewAll: { minHeight: 44, justifyContent: 'center', paddingLeft: 16 },
  viewAllLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  list: { gap: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
