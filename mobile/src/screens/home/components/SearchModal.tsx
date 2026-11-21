import SearchResultsSkeleton from './SearchResultsSkeleton';
import AccountBadges from '../../../components/AccountBadges';
import ModalSurface from '../../../components/ModalSurface';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMockRooms } from '../../../state/MockRoomsContext';
import { usePlaylists } from '../../../state/PlaylistsContext';
import { mockAccounts } from '../../../data/mockAccounts';
import PlaylistCover from '../../playlists/components/PlaylistCover';
import { getSong, songs } from '../../../data/songs';
import { useLocalProfile } from '../../../state/ProfileContext';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

// Temporary preview delay, matching Home; replace with request readiness later.
const SEARCH_LOADING_DELAY_MS = 2000;

const defaultCover = require('../../../../assets/covers/notification-default.jpg');
const defaultAvatar = require('../../../../assets/avatars/cuevo-mascot.png');
const roomBackgrounds: Record<string, string> = {
  'kitchen-disco': 'linear-gradient(145deg, #FFB86B 0%, #FF6A36 45%, #D83B25 100%)',
  'late-nights': 'linear-gradient(145deg, #C3C9F5 0%, #797FBD 45%, #3C466F 100%)',
  'on-repeat': 'linear-gradient(145deg, #FFE69A 0%, #E9AD47 45%, #B67530 100%)',
};

function ArtworkImage({ source, fallback }: { source: ImageSourcePropType; fallback: ImageSourcePropType }) {
  const [failed, setFailed] = useState(false);
  return <Image source={failed ? fallback : source} onError={() => setFailed(true)} style={styles.artwork} accessible={false} />;
}

const roomNames: Record<string, string> = { 'kitchen-disco': 'Kitchen Disco', 'late-nights': 'Late Nights', 'on-repeat': 'On Repeat' };

export default function SearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { profile, accountStatus } = useLocalProfile();
  const [query, setQuery] = useState('');
  const [readyQuery, setReadyQuery] = useState<string | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const { rooms } = useMockRooms();
  const { playlists } = usePlaylists();
  const search = query.trim().toLowerCase();
  const loading = visible && !!search && readyQuery !== query;
  useEffect(() => {
    if (!visible || !query.trim()) return;
    const timer = setTimeout(() => setReadyQuery(query), SEARCH_LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, query]);
  function changeQuery(value: string) {
    setReadyQuery(null);
    setQuery(value);
  }
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const results = search ? [
    ...Object.entries(rooms).map(([id, room]) => ({ id, name: room.name ?? roomNames[id] ?? id, detail: 'Room', keywords: room.name ?? roomNames[id] ?? id, type: 'room' as const })),
    ...playlists.map(playlist => ({ id: playlist.id, name: playlist.name, detail: 'Playlist', keywords: `${playlist.name} ${playlist.description}`, type: 'playlist' as const })),
    ...songs.map(song => ({ id: song.id, name: song.title, detail: `Song · ${song.artist}`, keywords: `${song.title} ${song.artist} ${song.album} ${song.genres.join(' ')}`, type: 'song' as const })),
    ...mockAccounts.map(account => {
      const person = account.id === 'self' ? profile : account;
      return { id: account.id, name: person.displayName, detail: `Profile · @${person.username}`, keywords: `${person.displayName} ${person.username}`, type: 'profile' as const, status: account.id === 'self' ? accountStatus : account };
    }),
  ].filter(item => terms.every(term => normalize(item.keywords).includes(term))) : [];
  const resultIcons = { room: 'radio', playlist: 'albums', song: 'musical-note', profile: 'person' } as const;

  const sections = ([['room', 'Rooms'], ['playlist', 'Playlists'], ['song', 'Songs'], ['profile', 'Profiles']] as const)
    .map(([type, title]) => ({ type, title, items: results.filter(item => item.type === type) }))
    .filter(section => section.items.length > 0);

  function renderArtwork(item: typeof results[number]) {
    if (item.type === 'profile') {
      const person = item.id === 'self' ? profile : mockAccounts.find(account => account.id === item.id);
      return <ArtworkImage key={person?.avatarUri ?? 'default-avatar'} source={person?.avatarUri ? { uri: person.avatarUri } : defaultAvatar} fallback={defaultAvatar} />;
    }
    if (item.type === 'song') return <ArtworkImage source={getSong(item.id)?.cover ?? defaultCover} fallback={defaultCover} />;
    if (item.type === 'playlist') {
      const playlist = playlists.find(playlist => playlist.id === item.id);
      if (playlist?.songIds.some(id => !!getSong(id))) return <PlaylistCover songIds={playlist.songIds} size={46} />;
    }
    if (item.type === 'room' && roomBackgrounds[item.id]) return <View style={[styles.artwork, { backgroundImage: roomBackgrounds[item.id] }]} />;
    return <ArtworkImage source={defaultCover} fallback={defaultCover} />;
  }

  function openResult(item: typeof results[number]) {
    close();
    if (item.type === 'song') router.push({ pathname: '/song/[id]', params: { id: item.id } });
    else if (item.type === 'profile') router.push({ pathname: '/profile', params: { userId: item.id } });
    else router.push({ pathname: item.type === 'room' ? '/room/[id]' : '/playlist/[id]', params: { id: item.id } });
  }

  function close() {
    Keyboard.dismiss();
    changeQuery('');
    onClose();
  }

  return <Modal visible={visible} transparent animationType="slide" onShow={() => input.current?.focus()} onRequestClose={close}>
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]} accessibilityViewIsModal onAccessibilityEscape={close}>
      <ModalSurface radius={0} />
        <View style={styles.header}>
          <View style={styles.search}>
            <Ionicons name="search" size={22} color={colors.textSecondary} accessible={false} />
            <TextInput ref={input} value={query} onChangeText={changeQuery} placeholder="Search anything…" placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Search rooms, playlists, songs and profiles" autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={styles.input} />
            {query.length > 0 && <Pressable onPress={() => { changeQuery(''); input.current?.focus(); }} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.iconButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} accessible={false} />
            </Pressable>}
          </View>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close search" style={styles.iconButton}>
            <Ionicons name="close" size={25} color={colors.text} accessible={false} />
          </Pressable>
        </View>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 76}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.results}>
          {!search && <Text style={styles.hint}>Search rooms, playlists, songs and profiles.</Text>}
          {loading && <SearchResultsSkeleton />}
          {!!search && !loading && results.length === 0 && <Text style={styles.hint}>No results found. Try another name, artist or username.</Text>}
          {!loading && sections.map(section => <View key={section.type} style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(item => <Pressable key={`${item.type}-${item.id}`} accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.type}${item.type === 'profile' ? `${item.status.verified ? ', verified' : ''}${item.status.subscriptionActive ? ', Cuevo Plus subscriber' : ''}` : ''}`} style={styles.result}
            onPress={() => openResult(item)}>
            <View style={styles.artworkContainer}>
              {renderArtwork(item)}
              <View style={styles.typeBadge}><Ionicons name={resultIcons[item.type]} size={12} color="#777777" accessible={false} /></View>
            </View>
            <View style={styles.resultText}><View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{item.name}</Text>{item.type === 'profile' && <AccountBadges {...item.status} size={16} />}</View><Text style={styles.kind}>{item.detail}</Text></View>
          </Pressable>)}
          </View>)}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  search: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 4, borderRadius: 16, backgroundColor: '#F1EEEA' },
  input: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: fonts.input, letterSpacing: 0, fontSize: 14, color: colors.text },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  results: { paddingHorizontal: 20, paddingBottom: 24 },
  hint: { paddingVertical: 28, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  section: { marginTop: 12 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text, marginBottom: 6 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  artworkContainer: { width: 46, height: 46 },
  artwork: { width: 46, height: 46, borderRadius: 9, backgroundColor: '#F1EEEA' },
  typeBadge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEEEEE', borderWidth: 2, borderColor: '#FFFCF8', alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  kind: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});
