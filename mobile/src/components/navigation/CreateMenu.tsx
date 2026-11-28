import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import ModalSurface from '../ModalSurface';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastViewport } from '../AppToast';
import JoinCodeInput from './JoinCodeInput';
import PrimaryButton from '../PrimaryButton';
import CreateMenuBackdrop from './CreateMenuBackdrop';
import StaggeredMenuItem from './StaggeredMenuItem';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

import { usePlaylists } from '../../state/PlaylistsContext';
import { useMockRooms, type RoomVisibility } from '../../state/MockRoomsContext';
import { showToast } from '../../utils/toast';

type Action = 'room' | 'join' | 'playlist';
const actions = [
  { id: 'room' as const, title: 'Create a room', description: 'Bring everyone into the same music queue.', icon: 'radio' as const },
  { id: 'join' as const, title: 'Join with a code', description: 'Have an invite? Find your people.', icon: 'key' as const },
  { id: 'playlist' as const, title: 'Create a playlist', description: 'Start a collection to build together.', icon: 'albums' as const },
];

export default function CreateMenu({ onClose, blurTarget }: { onClose: () => void; blurTarget: RefObject<ComponentRef<typeof View> | null> }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const insets = useSafeAreaInsets();
  const [action, setAction] = useState<Action | null>(null);
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState<RoomVisibility>('public');
  const [genre, setGenre] = useState('Mixed');
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const { createPlaylist } = usePlaylists();
  const { rooms, createRoom, setJoined } = useMockRooms();
  function join() {
    if (submitted.current) return;
    if (code.join('') !== 'AAAAAA') {
      showToast('error', 'Invalid invite code', 'Check your six-character code and try again.');
      return;
    }
    if (rooms['on-repeat']?.playback.ended) { showToast('error', 'Room has ended', 'This room is now available to view only.'); return; }
    submitted.current = true;
    setJoined('on-repeat', true);
    onClose();
    router.push({ pathname: '/room/[id]', params: { id: 'on-repeat' } });
    // Wait for the native modal to dismiss so the root toast host receives this.
    setTimeout(() => showToast('success', 'Joined room', 'On Repeat'), 500);
  }
  function create() {
    if (action !== 'room' && action !== 'playlist') return;
    const name = value.trim();
    if (!name) { setError(`Enter a ${action === 'room' ? 'room' : 'playlist'} name.`); return; }
    if (submitted.current) return;
    submitted.current = true;
    const id = action === 'room' ? createRoom(name, { visibility, genre }) : createPlaylist(name);
    onClose();
    router.push({ pathname: action === 'room' ? '/room/[id]' : '/playlist/[id]', params: { id } });
    showToast('success', action === 'room' ? 'Room created' : 'Playlist created', name);
  }
  const current = actions.find((item) => item.id === action);

  useEffect(() => {
    if (action) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => subscription.remove();
  }, [action, onClose]);

  if (!action) return (
    <View style={styles.floatingOverlay} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <CreateMenuBackdrop blurTarget={blurTarget} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss actions" />
      <View pointerEvents="box-none" style={[styles.floatingMenu, { bottom: Math.max(insets.bottom, 16) + 92, top: insets.top + 20 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.floatingActions}>
          {actions.map((item, index) => (
            <StaggeredMenuItem key={item.id} index={index}>
            <Pressable onPress={() => setAction(item.id)} accessibilityRole="button"
              style={({ pressed }) => [styles.floatingAction, { marginRight: index === 1 ? 32 : index === 0 ? 10 : 0 }, pressed && styles.floatingPressed]}>
              <View style={[styles.glassIcon, { backgroundImage: index === 0 ? 'linear-gradient(145deg, #FFB66E, #D84720)' : index === 1 ? 'linear-gradient(145deg, #FFD99A, #B96C21)' : 'linear-gradient(145deg, #FFB99B, #D85943)' }]}>
                <View style={styles.iconGloss} />
                <Ionicons name={item.icon} size={25} color="#FFF8EC" accessible={false} />
              </View>
              <Text style={styles.floatingLabel}>{item.title}</Text>
            </Pressable>
            </StaggeredMenuItem>
          ))}
        </ScrollView>
      </View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close actions"
        style={({ pressed }) => [styles.floatingClose, { bottom: Math.max(insets.bottom, 16) + 1 }, pressed && styles.floatingPressed]}>
        <Ionicons name="close" size={30} color={colors.text} accessible={false} />
      </Pressable>
    </View>
  );


  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <ToastViewport>
      <KeyboardAvoidingView style={[styles.overlay, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss actions" />
        <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <ModalSurface solid />
          <View style={styles.header}>
            {action && <Pressable onPress={() => { setAction(null); setVisibility('public'); setGenre('Mixed'); setValue(''); setError(''); setCode(Array(6).fill('')); }} accessibilityRole="button" accessibilityLabel="Back to actions" style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>}
            <Text accessibilityRole="header" style={styles.title}>{current?.title ?? 'Make room for music.'}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close actions" style={styles.iconButton}><Ionicons name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.form}>
              <Text style={styles.label}>{action === 'join' ? 'Invite code' : action === 'room' ? 'Room name' : 'Playlist name'}</Text>
              {action === 'join' ? <JoinCodeInput value={code} onChange={setCode} onSubmit={join} /> :
                <TextInput keyboardAppearance={colors.dark ? 'dark' : 'light'} value={value} onChangeText={text => { setValue(text); setError(''); }} maxLength={60} autoCapitalize="sentences" autoCorrect={false} placeholder="Give it a name" placeholderTextColor={colors.textSecondary} accessibilityLabel={action === 'room' ? 'Room name' : 'Playlist name'} style={styles.input} selectionColor={colors.primary} />}
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              {action === 'room' && <>
                <Text style={styles.label}>Visibility</Text>
                <View style={styles.visibilityRow}>
                  {(['public', 'private'] as const).map(option => <Pressable key={option} onPress={() => setVisibility(option)} accessibilityRole="radio" accessibilityState={{ checked: visibility === option }} style={[styles.visibilityOption, visibility === option && styles.optionSelected]}>
                    <Ionicons name={option === 'public' ? 'globe-outline' : 'lock-closed-outline'} size={20} color={visibility === option ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.optionLabel, visibility === option && styles.optionLabelSelected]}>{option === 'public' ? 'Public' : 'Private'}</Text>
                  </Pressable>)}
                </View>
                <Text style={styles.description}>{visibility === 'public' ? 'Anyone can discover and join your room.' : 'Only people you invite can join your room.'}</Text>
                <Text style={styles.label}>Genre</Text>
                <View style={styles.genreOptions}>
                  {['Mixed', 'Pop', 'Disco', 'R&B', 'Hip-hop', 'House', 'Rock', 'Jazz', 'Indie'].map(option => <Pressable key={option} onPress={() => setGenre(option)} accessibilityRole="radio" accessibilityState={{ checked: genre === option }} style={[styles.genreOption, genre === option && styles.optionSelected]}>
                    <Text style={[styles.optionLabel, genre === option && styles.optionLabelSelected]}>{option}</Text>
                  </Pressable>)}
                </View>
              </>}
              <PrimaryButton label={action === 'join' ? 'Join room' : current?.title ?? 'Continue'} onPress={action === 'join' ? join : create} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </ToastViewport>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(35,27,24,0.22)' },
  sheet: { width: '100%', maxWidth: 420, maxHeight: '85%', backgroundColor: 'transparent', borderRadius: 28, padding: 20, boxShadow: '0px 12px 40px rgba(35,27,24,0.12)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 23, color: colors.text, letterSpacing: -0.5 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  formScroll: { marginHorizontal: -20 },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 10 },
  floatingOverlay: { ...StyleSheet.absoluteFill, zIndex: 20 },
  floatingMenu: { position: 'absolute', left: 20, right: 20, justifyContent: 'flex-end' },
  floatingActions: { flexGrow: 1, justifyContent: 'flex-end', alignItems: 'flex-end', gap: 24, paddingVertical: 8 },
  floatingAction: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingLeft: 7, paddingRight: 21, paddingVertical: 7, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  floatingLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  glassIcon: { width: 48, height: 48, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: 'inset 0px 1px 5px rgba(255,255,255,0.3)' },
  iconGloss: { ...StyleSheet.absoluteFill, backgroundImage: 'radial-gradient(ellipse farthest-corner at 25% 5%, rgba(255,255,255,0.4), rgba(255,255,255,0) 70%)' },
  floatingClose: { position: 'absolute', right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', backgroundImage: 'linear-gradient(140deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 60%)', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 0px 0px 6px rgba(255,255,255,0.04)' },
  floatingPressed: { opacity: 0.7 },
  description: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  error: { fontFamily: fonts.regular, fontSize: 13, color: '#B93D1B' },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityOption: { flex: 1, minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: '#E2DBD4', backgroundColor: '#FFFFFF' },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#FFF0E9' },
  optionLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  optionLabelSelected: { color: colors.primary },
  genreOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreOption: { minHeight: 44, paddingHorizontal: 15, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#E2DBD4', backgroundColor: '#FFFFFF' },
  form: { gap: 16 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  input: { minHeight: 54, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#F1EEEA', fontFamily: fonts.input, letterSpacing: 0, fontSize: 15, color: colors.text },
});
