import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function JoinCodeInput({ value, onChange, onSubmit }: { value: string[]; onChange: (value: string[]) => void; onSubmit: () => void }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const inputs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  function change(text: string, index: number) {
    const letters = text.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const next = [...value];
    if (!letters) {
      next[index] = '';
    } else {
      // Full-code paste fills from the first box; shorter pastes start at the focused box.
      const start = letters.length >= 6 ? 0 : index;
      for (let offset = 0; offset < Math.min(letters.length, 6 - start); offset++) next[start + offset] = letters[offset];
      inputs.current[Math.min(start + letters.length, 5)]?.focus();
    }
    onChange(next);
  }
  return <View style={styles.row}>
    {value.map((letter, index) => <TextInput keyboardAppearance={colors.dark ? 'dark' : 'light'} key={index}
      ref={input => { inputs.current[index] = input; }}
      value={letter} onChangeText={text => change(text, index)}
      onFocus={() => setFocused(index)} onBlur={() => setFocused(null)}
      onKeyPress={({ nativeEvent }) => {
        if (nativeEvent.key === 'Backspace' && !letter && index > 0) {
          const next = [...value]; next[index - 1] = ''; onChange(next); inputs.current[index - 1]?.focus();
        }
      }}
      selectTextOnFocus autoCapitalize="characters" autoCorrect={false} spellCheck={false}
      returnKeyType={index === 5 ? 'go' : 'next'}
      onSubmitEditing={() => index === 5 ? onSubmit() : inputs.current[index + 1]?.focus()}
      accessibilityLabel={`Invite code character ${index + 1} of 6`}
      style={[styles.box, focused === index && styles.focused]} selectionColor={colors.primary} />)}
  </View>;
}
const baseStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  box: { flex: 1, minWidth: 0, height: 60, borderRadius: 13, borderWidth: 1, borderColor: '#DED8D1', backgroundColor: '#F1EEEA', textAlign: 'center', paddingHorizontal: 0, fontFamily: fonts.semibold, fontSize: 24, color: colors.text },
  focused: { borderColor: colors.primary, backgroundColor: '#FFF0E5' },
});
