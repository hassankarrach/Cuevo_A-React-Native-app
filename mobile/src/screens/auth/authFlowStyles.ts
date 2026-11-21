import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export const authFlowStyles = StyleSheet.create({
  form: { paddingHorizontal: 12, paddingTop: 24, paddingBottom: 24, gap: 22 },
  icon: { width: 76, height: 76, borderRadius: 25, backgroundColor: '#FFF0E5', alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: fonts.semibold, fontSize: 27, lineHeight: 34, color: colors.text, letterSpacing: -0.5 },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  email: { fontFamily: fonts.semibold, color: colors.text },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  muted: { color: '#A19892' },
  actions: { gap: 6 },
});
