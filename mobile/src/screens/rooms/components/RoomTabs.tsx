import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAppColors } from '../../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

export type RoomTab = 'queue' | 'activity';
export default function RoomTabs({ selected, onSelect }: { selected: RoomTab; onSelect: (tab: RoomTab) => void }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  return <View accessibilityRole="tablist" style={styles.tabs}>
    {(['queue', 'activity'] as const).map(tab => <Pressable key={tab} accessibilityRole="tab"
      accessibilityState={{ selected: selected === tab }} onPress={() => onSelect(tab)}
      style={({ pressed }) => [styles.tab, selected === tab && styles.selected, pressed && styles.pressed]}>
      <Ionicons name={tab === 'queue' ? 'musical-notes' : 'time'} size={18} color={selected === tab ? colors.primary : colors.textSecondary} accessible={false} />
      <Text style={[styles.label, selected === tab && styles.selectedLabel]}>{tab === 'queue' ? 'Queue' : 'Activity'}</Text>
    </Pressable>)}
  </View>;
}
const baseStyles = StyleSheet.create({
  tabs: { marginTop: 18, marginLeft: 6, marginRight: 18, padding: 4, borderRadius: 18, backgroundColor: '#F2EDE7', flexDirection: 'row', gap: 4 },
  tab: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  selected: { backgroundColor: '#FFFFFF', boxShadow: '0px 2px 6px rgba(35,27,24,0.06)' },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  selectedLabel: { color: colors.primary, fontFamily: fonts.semibold },
  pressed: { opacity: 0.7 },
});
