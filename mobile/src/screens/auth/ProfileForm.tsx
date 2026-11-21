import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function ProfileForm({ onExplore }: { onExplore: () => void }) {
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const pickerOpen = useRef(false);

  async function pickAvatar() {
    if (pickerOpen.current) return;
    pickerOpen.current = true;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch {
      showToast('error', 'Couldn’t open photo', 'Please try choosing a photo again.');
    } finally {
      pickerOpen.current = false;
      setPicking(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.heading}>What should we call you?</Text>
      <Text style={styles.description}>Choose a name people will see in rooms, playlists, and votes. Add a photo if you like.</Text>
      <View style={styles.photoSection}>
        <Pressable onPress={pickAvatar} disabled={picking} accessibilityRole="button"
          accessibilityLabel={avatarUri ? 'Change profile photo' : 'Add profile photo'} style={styles.avatar}>
          <Image source={avatarUri ? { uri: avatarUri } : require('../../../assets/avatars/cuevo-mascot.png')} style={styles.photo} />
        </Pressable>
        <Pressable onPress={pickAvatar} disabled={picking} accessibilityRole="button" style={styles.photoAction}>
          <Text style={styles.photoLabel}>{picking ? 'Opening photos…' : avatarUri ? 'Change photo' : 'Add a photo'}</Text>
        </Pressable>
        {avatarUri && <Pressable onPress={() => setAvatarUri(null)} accessibilityRole="button" style={styles.photoAction}>
          <Text style={styles.removeLabel}>Remove photo</Text>
        </Pressable>}
      </View>
      <Text style={styles.label}>Display name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#91969A" accessibilityLabel="Display name" autoComplete="nickname" autoCapitalize="words" maxLength={40} returnKeyType="done" selectionColor={colors.primary} style={styles.input} />
      <PrimaryButton label="Explore Cuevo" onPress={onExplore} />
    </View>
  );
}
const styles = StyleSheet.create({
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
