import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { useLocalProfile } from '../../state/ProfileContext';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import ProfileHeader from './ProfileHeader';
import ProfileLayout, { goBackFromProfile } from './ProfileLayout';
import { profileStyles as styles } from './profileStyles';

const genreOptions = ['Pop', 'Hip-hop', 'R&B', 'House', 'Rock', 'Jazz', 'Afrobeats', 'Indie'];

export default function OwnProfileScreen() {
  const { profile, accountStatus, saveProfile } = useLocalProfile();
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const pickerOpen = useRef(false);


  async function pickPhoto() {
    if (pickerOpen.current) return;
    pickerOpen.current = true;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) setDraft((current) => ({ ...current, avatarUri: result.assets[0].uri }));
    } catch {
      showToast('error', 'Couldn’t open photo', 'Please try choosing a photo again.');
    } finally {
      pickerOpen.current = false;
      setPicking(false);
    }
  }

  function save() {
    if (!draft.displayName.trim()) { setError('Please enter a display name.'); return; }
    saveProfile({ ...draft, displayName: draft.displayName.trim(), username: draft.username.trim(), bio: draft.bio.trim(), location: draft.location.trim() });
    goBackFromProfile();
    showToast('success', 'Profile saved');
  }

  return <ProfileLayout title="Edit profile">
    <ProfileHeader profile={draft} {...accountStatus} onPickPhoto={pickPhoto} picking={picking} />
    <View style={styles.cardBody}>
              {draft.avatarUri && <Pressable onPress={() => setDraft({ ...draft, avatarUri: null })} accessibilityRole="button" style={styles.removePhoto}><Text style={styles.removeText}>Remove photo</Text></Pressable>}
              <View style={styles.fields}>
                <View style={styles.field}>
                  <Text style={styles.label}>Display name</Text>
                  <TextInput value={draft.displayName} onChangeText={(displayName) => { setDraft({ ...draft, displayName }); setError(''); }} accessibilityLabel="Display name" maxLength={40} autoComplete="nickname" style={[styles.input, !!error && styles.invalid]} selectionColor={colors.primary} />
                  {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput value={draft.username} onChangeText={(username) => setDraft({ ...draft, username })} accessibilityLabel="Username" placeholder="Choose a username" placeholderTextColor="#A19892" autoCapitalize="none" autoCorrect={false} maxLength={30} style={styles.input} selectionColor={colors.primary} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput value={draft.bio} onChangeText={(bio) => setDraft({ ...draft, bio })} accessibilityLabel="Bio" placeholder="A little about you and your music…" placeholderTextColor="#A19892" multiline maxLength={160} textAlignVertical="top" style={[styles.input, styles.bio]} selectionColor={colors.primary} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput value={draft.location} onChangeText={(location) => setDraft({ ...draft, location })} accessibilityLabel="Location" placeholder="City (optional)" placeholderTextColor="#A19892" maxLength={60} style={styles.input} selectionColor={colors.primary} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Music preferences</Text>
                  <View style={styles.genres}>
                    {genreOptions.map((genre) => {
                      const selected = draft.genres.includes(genre);
                      return <Pressable key={genre} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setDraft({ ...draft, genres: selected ? draft.genres.filter((item) => item !== genre) : [...draft.genres, genre] })} style={[styles.chip, selected && styles.selectedChip]}>
                        <Text style={[styles.chipText, selected && styles.selectedChipText]}>{genre}</Text>
                      </Pressable>;
                    })}
                  </View>
                </View>
              </View>
              <View style={{ marginTop: 24 }}><PrimaryButton label="Save changes" onPress={save} /></View>
    </View>
  </ProfileLayout>;
}
