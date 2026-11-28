import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useAuth } from '../../state/AuthContext';
import { useLocalProfile } from '../../state/ProfileContext';
import { readProfile, saveSetup } from '../../api/profile';
import { registrationError } from '../../api/registration';

export default function ProfileForm({ onExplore }: { onExplore: () => void }) {
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { request, completeProfile } = useAuth();
  const { saveProfile } = useLocalProfile();
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void readProfile(request).then(profile => {
      if (active && profile) { setName(profile.displayName); setUsername(profile.username); setAvatarUri(profile.avatarUri); }
    }).catch(error => { if (active) { setError(registrationError(error)); setLoadFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request, attempt]);
  const [picking, setPicking] = useState(false);
  const pickerOpen = useRef(false);

  async function pickAvatar() {
    if (pickerOpen.current || pending.current || loading) return;
    pickerOpen.current = true;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!asset.base64) { setError('Couldn’t read this photo. Choose another image.'); return; }
        if (asset.base64.length * 3 / 4 > 2 * 1024 * 1024) { setError('Choose a photo smaller than 2 MB.'); return; }
        setAvatarUri(asset.uri); setPhoto(asset.base64); setRemovePhoto(false); setError('');
      }
    } catch {
      showToast('error', 'Couldn’t open photo', 'Please try choosing a photo again.');
    } finally {
      pickerOpen.current = false;
      setPicking(false);
    }
  }

  async function save() {
    if (pending.current || picking || loading || loadFailed) return;
    if (!name.trim()) { setError('Enter your display name.'); return; }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) { setError('Use 3–30 letters, numbers or underscores for your username.'); return; }
    pending.current = true; setSaving(true); setError('');
    try {
      const profile = await saveSetup(request, name, username, photo, removePhoto);
      await completeProfile();
      if (mounted.current) { saveProfile({ ...profile, avatarUri }); onExplore(); }
    } catch (error) {
      if (mounted.current) setError(error instanceof Error && error.name !== 'ApiError' ? error.message : registrationError(error));
    } finally { pending.current = false; if (mounted.current) setSaving(false); }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.heading}>What should we call you?</Text>
      <Text style={styles.description}>Choose a name people will see in rooms, playlists, and votes. Add a photo if you like.</Text>
      <View pointerEvents={saving || loading || loadFailed ? 'none' : 'auto'} style={styles.photoSection}>
        <Pressable onPress={pickAvatar} disabled={picking} accessibilityRole="button"
          accessibilityLabel={avatarUri ? 'Change profile photo' : 'Add profile photo'} style={styles.avatar}>
          <Image source={avatarUri ? { uri: avatarUri } : require('../../../assets/avatars/cuevo-mascot.png')} style={styles.photo} />
        </Pressable>
        <Pressable onPress={pickAvatar} disabled={picking} accessibilityRole="button" style={styles.photoAction}>
          <Text style={styles.photoLabel}>{picking ? 'Opening photos…' : avatarUri ? 'Change photo' : 'Add a photo'}</Text>
        </Pressable>
        {avatarUri && <Pressable onPress={() => { setAvatarUri(null); setPhoto(null); setRemovePhoto(true); }} accessibilityRole="button" style={styles.photoAction}>
          <Text style={styles.removeLabel}>Remove photo</Text>
        </Pressable>}
      </View>
      <Text style={styles.label}>Display name</Text>
      <TextInput editable={!saving && !loading && !loadFailed} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#91969A" accessibilityLabel="Display name" autoComplete="nickname" autoCapitalize="words" maxLength={40} returnKeyType="next" selectionColor={colors.primary} style={styles.input} />
      <Text style={styles.label}>Username</Text>
      <TextInput editable={!saving && !loading && !loadFailed} value={username} onChangeText={setUsername} placeholder="your_username" placeholderTextColor="#91969A" accessibilityLabel="Username" autoCapitalize="none" autoCorrect={false} maxLength={30} returnKeyType="done" selectionColor={colors.primary} style={styles.input} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {loadFailed ? <PrimaryButton label="Try again" onPress={() => { setError(''); setLoading(true); setLoadFailed(false); setAttempt(value => value + 1); }} />
        : <PrimaryButton label={loading ? 'Loading…' : saving ? 'Saving…' : 'Continue'} disabled={loading || saving || picking} onPress={save} />}
    </View>
  );
}
const styles = StyleSheet.create({
  error: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: '#C5392A' },
  form: { paddingHorizontal: 12, paddingTop: 24, paddingBottom: 24, gap: 20 },
  photoSection: { alignItems: 'center' },
  photo: { width: '100%', height: '100%', borderRadius: 10 },
  photoAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  photoLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  removeLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  heading: { fontFamily: fonts.semibold, fontSize: 27, lineHeight: 34, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.textSecondary },
  avatar: { alignSelf: 'center', width: 88, height: 88, borderRadius: 10, backgroundColor: '#FFF0EA', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: -10 },
  input: { minHeight: 60, borderRadius: 22, backgroundColor: '#F3F4F5', paddingHorizontal: 18, fontFamily: fonts.input, letterSpacing: 0, fontSize: 15, color: colors.text },
});
