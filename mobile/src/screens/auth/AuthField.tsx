import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function AuthField({ label, value, onChangeText, kind = 'email', error, hint, currentPassword = false }: {
  label: string; value: string; onChangeText: (value: string) => void; kind?: 'email' | 'password' | 'code'; error?: string; hint?: string; currentPassword?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.border, focused && styles.focused, !!error && styles.invalid]}>
      <View style={styles.surface}>
        <Ionicons name={kind === 'email' ? 'mail' : kind === 'code' ? 'keypad' : 'lock-closed'} size={21} color="#92979B" accessible={false} />
        <TextInput value={value} onChangeText={text => onChangeText(kind === 'code' ? text.replace(/\D/g, '').slice(0, 6) : text)}
          accessibilityLabel={label} placeholder={kind === 'email' ? 'you@example.com' : kind === 'code' ? '000000' : label}
          placeholderTextColor="#A19892" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          keyboardType={kind === 'email' ? 'email-address' : kind === 'code' ? 'number-pad' : 'default'}
          {...(Platform.OS === 'ios'
            ? { textContentType: kind === 'email' ? 'emailAddress' as const : kind === 'code' ? 'oneTimeCode' as const : currentPassword ? 'password' as const : 'newPassword' as const }
            : { autoComplete: kind === 'email' ? 'email' as const : kind === 'code' ? 'one-time-code' as const : currentPassword ? 'current-password' as const : 'new-password' as const })}
          autoCapitalize="none" autoCorrect={false} secureTextEntry={kind === 'password' && !revealed}
          maxLength={kind === 'code' ? 6 : kind === 'email' ? 254 : 128} selectionColor={colors.primary}
          style={[styles.input, kind === 'code' && styles.code]} />
        {kind === 'password' && <Pressable onPress={() => setRevealed(!revealed)} accessibilityRole="button" accessibilityLabel={`${revealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`} style={styles.visibility}><Ionicons name={revealed ? 'eye-off' : 'eye'} size={21} color="#92979B" /></Pressable>}
      </View>
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!error && !!hint && <Text style={styles.hint}>{hint}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  border: { padding: 1.5, borderRadius: 22, backgroundColor: '#F0F2F3', backgroundImage: 'linear-gradient(125deg, #FFFFFF, rgba(255,255,255,0) 60%, #FFFFFF)', boxShadow: '3px 5px 14px rgba(116,129,139,0.1)' },
  focused: { backgroundColor: '#D4DADE' },
  invalid: { backgroundColor: '#C5392A' },
  surface: { minHeight: 60, borderRadius: 20.5, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8, gap: 12, backgroundColor: '#F4F5F5' },
  input: { flex: 1, minHeight: 60, fontFamily: fonts.input, letterSpacing: 0, fontSize: 15, color: colors.text },
  code: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: 8 },
  visibility: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  error: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: '#C5392A' },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
});
