import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAppColors } from '../../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

export type RoomActivityEvent = { id: number; message: string; timestamp: number; icon: ComponentProps<typeof Ionicons>['name'] };
export default function RoomActivity({ events }: { events: RoomActivityEvent[] }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Room activity</Text>
    <Text style={styles.hint}>The latest moments in this room.</Text>
    {events.length === 0 && <Text style={styles.message}>No activity yet. Room moments will appear here.</Text>}
    {events.map(event => <View key={event.id} style={styles.event}>
      <View style={styles.icon}><Ionicons name={event.icon} size={18} color={colors.primary} accessible={false} /></View>
      <View style={styles.details}>
        <Text style={styles.message}>{event.message}</Text>
        <Text style={styles.time}>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>)}
  </View>;
}
const baseStyles = StyleSheet.create({
  section: { marginTop: 25, marginLeft: 6, marginRight: 18 },
  heading: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 5, marginBottom: 18 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE7DF' },
  icon: { width: 36, height: 36, borderRadius: 13, backgroundColor: '#FFF0E5', alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, gap: 6 },
  message: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
});
