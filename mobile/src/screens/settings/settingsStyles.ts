import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
export const settingsStyles = StyleSheet.create({
  section: { gap: 8 },
  sectionLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, marginLeft: 4, marginTop: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#EEE5DB', overflow: 'hidden' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 13 },
  rowCopy: { flex: 1, gap: 4 },
  heading: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 19 },
  divider: { height: 1, backgroundColor: '#F1ECE6', marginHorizontal: 16 },
  form: { padding: 16, gap: 15 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: '#F3F0EB' },
  selected: { backgroundColor: '#FFE7D8' },
  choiceText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  input: { minHeight: 52, backgroundColor: '#F3F0EB', borderRadius: 14, padding: 14, fontFamily: fonts.input, letterSpacing: 0, fontSize: 14, color: colors.text },
  error: { fontFamily: fonts.regular, fontSize: 12, color: '#B93D1B' },
});
