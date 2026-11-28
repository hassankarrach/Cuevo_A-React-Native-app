import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import { useSimulatedSearch } from '../../hooks/useSimulatedSearch';
import { RoomGridSkeleton } from '../../components/skeletons/ListSkeletons';
import ModalSurface from '../../components/ModalSurface';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeRooms from '../home/components/HomeRooms';
import { useMockRooms } from '../../state/MockRoomsContext';
import { roomGenres, type RoomSort } from '../../state/roomDiscovery';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const sortOptions: { value: RoomSort; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'participants-desc', label: 'Most participants' },
  { value: 'participants-asc', label: 'Fewest participants' },
  { value: 'genre', label: 'Genre (A–Z)' },
];

export default function RoomsScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const insets = useSafeAreaInsets();
  const { query, changeQuery, loading } = useSimulatedSearch();
  const [sort, setSort] = useState<RoomSort>('default');
  const [sortOpen, setSortOpen] = useState(false);
  const [genre, setGenre] = useState('all');
  const { rooms } = useMockRooms();
  const genres = [...new Set(Object.entries(rooms).flatMap(([id, room]) => roomGenres(id, room.genre)))].sort((a, b) => a.localeCompare(b));
  const hasFilters = sort !== 'default' || genre !== 'all';
  const [filterOpen, setFilterOpen] = useState(false);
  const closeFilters = () => { setSortOpen(false); setFilterOpen(false); };
  return <SafeAreaView edges={['left', 'right']} style={styles.screen}>
    <StatusBar style={colors.dark ? 'light' : 'dark'} />
    <View style={styles.titleRow}>
      <Text accessibilityRole="header" style={styles.title}>Rooms</Text>
      <Pressable onPress={() => router.push('/nearby')} accessibilityRole="button" accessibilityLabel="Find nearby rooms" style={styles.nearbyButton}><Ionicons name="bluetooth" size={18} color={colors.primary} /><Text style={styles.nearbyLabel}>Nearby</Text></Pressable>
    </View>
    <View style={styles.searchRow}>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.textSecondary} accessible={false} />
        <TextInput keyboardAppearance={colors.dark ? 'dark' : 'light'} value={query} onChangeText={changeQuery} placeholder="Search rooms…" accessibilityLabel="Search rooms" placeholderTextColor={colors.textSecondary} autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={styles.input} selectionColor={colors.primary} />
        {!!query && <Pressable onPress={() => changeQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></Pressable>}
      </View>
      <Pressable onPress={() => { Keyboard.dismiss(); setFilterOpen(true); }} accessibilityRole="button" accessibilityLabel={`Filter rooms, ${sortOptions.find(item => item.value === sort)?.label}, ${genre === 'all' ? 'All genres' : genre}`} style={[styles.filterButton, styles.filterOutline]}>
        <Ionicons name="filter" size={25} color={hasFilters ? colors.primary : colors.text}/>
        {hasFilters && <View style={styles.dot} />}
      </Pressable>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 120 }}>
      {loading ? <RoomGridSkeleton /> : <HomeRooms grid query={query} genre={genre} sort={sort} />}
    </ScrollView>
    <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={closeFilters}>
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFilters} accessibilityRole="button" accessibilityLabel="Dismiss filters" />
        <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={closeFilters}>
        <ModalSurface />
          <View style={styles.modalHeader}><Text accessibilityRole="header" style={styles.modalTitle}>Filter rooms</Text><Pressable onPress={closeFilters} accessibilityRole="button" accessibilityLabel="Close filters" style={styles.filterButton}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable></View>
          <ScrollView>
            <Text accessibilityRole="header" style={styles.sectionLabel}>Sort by</Text>
            <Pressable onPress={() => setSortOpen(open => !open)} accessibilityRole="button" accessibilityLabel={`Sort by, ${sortOptions.find(item => item.value === sort)?.label}`} accessibilityState={{ expanded: sortOpen }} style={styles.sortDropdown}>
              <Text style={styles.optionText}>{sortOptions.find(item => item.value === sort)?.label}</Text>
              <Ionicons name={sortOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} accessible={false} />
            </Pressable>
            {sortOpen && <View style={styles.sortMenu}>
              {sortOptions.map(item => <Pressable key={item.value} onPress={() => { setSort(item.value); setSortOpen(false); }} accessibilityRole="radio" accessibilityState={{ checked: sort === item.value }} style={[styles.option, sort === item.value && styles.selected]}>
                <Text style={styles.optionText}>{item.label}</Text>
                {sort === item.value && <Ionicons name="checkmark" size={20} color={colors.primary} accessible={false} />}
              </Pressable>)}
            </View>}
            <Text accessibilityRole="header" style={styles.sectionLabel}>Genre</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genrePills}>
              {[{ value: 'all', label: 'All genres' }, ...genres.map(value => ({ value, label: value }))].map(item => <Pressable key={item.value} onPress={() => setGenre(item.value)} accessibilityRole="radio" accessibilityState={{ checked: genre === item.value }} style={[styles.genrePill, genre === item.value && styles.genrePillSelected]}>
                <Text style={[styles.genreText, genre === item.value && styles.genreTextSelected]}>{item.label}</Text>
                {genre === item.value && <Ionicons name="checkmark" size={16} color="#FFFFFF" accessible={false} />}
              </Pressable>)}
            </ScrollView>
            <Pressable onPress={() => { setSort('default'); setGenre('all'); setSortOpen(false); }} accessibilityRole="button" style={styles.reset}><Text style={styles.resetText}>Reset filters</Text></Pressable>
            <Pressable onPress={closeFilters} accessibilityRole="button" style={styles.done}><Text style={styles.doneText}>Show rooms</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}
const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFCF8', paddingHorizontal: 20, paddingTop: 12 },
  title: { fontFamily: fonts.semibold, fontSize: 31, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nearbyButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#FFECE0', flexDirection: 'row', alignItems: 'center', gap: 5 },
  nearbyLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 },
  search: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 14, borderRadius: 17, backgroundColor: '#F1EEEA' },
  input: { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 12, fontFamily: fonts.input, letterSpacing: 0, fontSize: 15, color: colors.text },
  clear: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filterOutline: { height: 52, borderWidth: 1, borderColor: '#D1CBC5', borderRadius: 14 },
  dot: { position: 'absolute', right: 4, top: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(35,27,24,0.3)' },
  sheet: { backgroundColor: 'transparent', borderRadius: 28, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 23, color: colors.text },
  sortDropdown: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D1CBC5', borderRadius: 14, backgroundColor: '#FFFFFF' },
  sortMenu: { marginTop: 6, padding: 4, borderRadius: 16, borderWidth: 1, borderColor: '#EEEAE4', backgroundColor: '#FFFFFF' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 12, borderRadius: 16, marginBottom: 6 },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, marginTop: 12, marginBottom: 8 },
  genrePills: { gap: 8, paddingVertical: 4 },
  genrePill: { minHeight: 44, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, backgroundColor: '#F1EEEA' },
  genrePillSelected: { backgroundColor: colors.text },
  genreText: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  genreTextSelected: { color: '#FFFFFF' },
  done: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.primary },
  doneText: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFFFFF' },
  selected: { backgroundColor: '#FFF0E5' },
  optionText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  reset: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  resetText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
});
