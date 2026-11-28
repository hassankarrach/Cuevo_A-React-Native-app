import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import { useSimulatedSearch } from '../../hooks/useSimulatedSearch';
import { PlaylistListSkeleton } from '../../components/skeletons/ListSkeletons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlaylists } from '../../state/PlaylistsContext';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import PlaylistCard from './components/PlaylistCard';

export default function PlaylistsScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const insets = useSafeAreaInsets();
  const { playlists } = usePlaylists();
  const { query: search, changeQuery, loading } = useSimulatedSearch();
  const results = playlists.filter(playlist => playlist.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <SafeAreaView edges={['left', 'right']} style={styles.screen}>
    <StatusBar style={colors.dark ? 'light' : 'dark'} />
    <Text accessibilityRole="header" style={styles.title}>Playlists</Text>
    <Text style={styles.subtitle}>Your favorites. Better together.</Text>
    <View style={styles.search}><Ionicons name="search" size={20} color={colors.textSecondary} /><TextInput keyboardAppearance={colors.dark ? 'dark' : 'light'} value={search} onChangeText={changeQuery} placeholder="Find a playlist" accessibilityLabel="Find a playlist" placeholderTextColor={colors.textSecondary} style={styles.input} selectionColor={colors.primary} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}>
      {loading ? <PlaylistListSkeleton /> : results.map(playlist => <PlaylistCard key={playlist.id} playlist={playlist} />)}
      {!loading && results.length === 0 && <Text style={styles.subtitle}>No playlists match your search.</Text>}
    </ScrollView>
  </SafeAreaView>;
}
const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFCF8', paddingHorizontal: 20, paddingTop: 12 },
  title: { fontFamily: fonts.semibold, fontSize: 31, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textSecondary, marginTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F1EDE7', borderRadius: 17, paddingHorizontal: 14, marginVertical: 24 },
  input: { flex: 1, minHeight: 52, fontFamily: fonts.input, letterSpacing: 0, fontSize: 14, color: colors.text },
  list: { gap: 14 },
});
