import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAppColors } from '../../../theme/useAppColors';
import ModalSurface from '../../../components/ModalSurface';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../../../components/PrimaryButton';
import { playlistEditPolicy, type Playlist, type PlaylistDetails } from '../../../data/mockPlaylists';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

export default function EditPlaylistModal({ playlist, onClose, onSave }: { playlist: Playlist; onClose: () => void; onSave: (details: PlaylistDetails) => void }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const insets = useSafeAreaInsets();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description);
  const [isPrivate, setPrivate] = useState(playlist.private);
  const [policy, setPolicy] = useState(playlistEditPolicy(playlist));
  const [error, setError] = useState('');
  function save() {
    if (!name.trim()) { setError('Enter a playlist name.'); return; }
    onSave({ name: name.trim(), description: description.trim(), private: isPrivate, editPolicy: policy });
  }
  function option(label: string, selected: boolean, onPress: () => void, hint?: string) {
    return <Pressable key={label} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.option, selected && styles.selected]}>
      <View style={styles.optionCopy}><Text style={styles.optionLabel}>{label}</Text>{hint && <Text style={styles.hint}>{hint}</Text>}</View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse'} size={22} color={selected ? colors.primary : '#DDD5CC'} />
    </Pressable>;
  }
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.overlay, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel playlist edits" />
      <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <ModalSurface />
        <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Edit playlist</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close playlist editor" style={styles.close}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable></View>
        <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.form}>
          <Text style={styles.label}>Playlist name</Text>
          <TextInput keyboardAppearance={colors.dark ? 'dark' : 'light'} value={name} onChangeText={text => { setName(text); setError(''); }} maxLength={60} accessibilityLabel="Playlist name" placeholder="Give it a name" placeholderTextColor={colors.textSecondary} style={styles.input} selectionColor={colors.primary} />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Text style={styles.label}>Description</Text>
          <TextInput keyboardAppearance={colors.dark ? 'dark' : 'light'} value={description} onChangeText={setDescription} maxLength={300} multiline accessibilityLabel="Playlist description" placeholder="What’s this playlist about?" placeholderTextColor={colors.textSecondary} style={[styles.input, styles.description]} selectionColor={colors.primary} />
          <Text style={styles.label}>Visibility</Text>
          <View accessibilityRole="radiogroup">
            {option('Public', !isPrivate, () => setPrivate(false), 'Anyone can discover this playlist.')}
            {option('Private', isPrivate, () => { setPrivate(true); if (policy === 'everyone') setPolicy('collaborators'); }, 'Only invited people can access it.')}
          </View>
          <Text style={styles.label}>Who can edit songs?</Text>
          <View accessibilityRole="radiogroup">
            {option('Only you', policy === 'owner', () => setPolicy('owner'))}
            {option('Invited collaborators', policy === 'collaborators', () => setPolicy('collaborators'))}
            {!isPrivate && option('Everyone', policy === 'everyone', () => setPolicy('everyone'))}
          </View>
          <PrimaryButton label="Save changes" onPress={save} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const baseStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(35,27,24,0.3)' },
  sheet: { width: '100%', maxWidth: 440, alignSelf: 'center', maxHeight: '90%', borderRadius: 28, padding: 20, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 23, color: colors.text },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  formScroll: { marginHorizontal: -20 },
  form: { gap: 10, paddingHorizontal: 20, paddingBottom: 28 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  input: { minHeight: 52, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F1EEEA', fontFamily: fonts.input, letterSpacing: 0, fontSize: 15, color: colors.text },
  description: { minHeight: 90, textAlignVertical: 'top' },
  error: { fontFamily: fonts.regular, fontSize: 13, color: '#B93D1B' },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, marginBottom: 5 },
  selected: { backgroundColor: '#FFF0E5' },
  optionCopy: { flex: 1, gap: 4 },
  optionLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
});
