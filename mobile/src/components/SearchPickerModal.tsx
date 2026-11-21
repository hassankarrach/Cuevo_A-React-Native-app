import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import AppToast from './AppToast';
import ModalSurface from './ModalSurface';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  children: (query: string) => ReactNode;
};

export default function SearchPickerModal(props: Props) {
  // Mount a fresh search session each time: reopening never shows old results.
  return props.visible ? <Picker {...props} /> : null;
}

function Picker({ onClose, title, placeholder, children }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.overlay, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title.toLowerCase()}`} />
      <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <ModalSurface />
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title.toLowerCase()}`} style={styles.close}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textSecondary} accessible={false} />
            <TextInput value={query} onChangeText={setQuery} placeholder={placeholder} accessibilityLabel={placeholder} placeholderTextColor={colors.textSecondary} autoCorrect={false} autoCapitalize="none" returnKeyType="search" selectionColor={colors.primary} style={styles.input} />
            {!!query && <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}><Ionicons name="close-circle" size={19} color={colors.textSecondary} /></Pressable>}
          </View>
        </View>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.results}>
          {query.trim() ? children(query.trim().toLocaleLowerCase()) : <Text style={styles.hint}>Type to search.</Text>}
        </ScrollView>
      </View>
      <AppToast />
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(35,27,24,0.3)' },
  sheet: { height: '80%', maxHeight: '100%', width: '100%', maxWidth: 440, alignSelf: 'center', borderRadius: 28, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchBox: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, borderRadius: 15, backgroundColor: '#F1EDE7' },
  input: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: fonts.input, fontSize: 13, color: colors.text, paddingRight: 8 },
  clear: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 21, color: colors.text },
  scroll: { flex: 1, minHeight: 0 },
  results: { paddingBottom: 20 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 28 },
});
