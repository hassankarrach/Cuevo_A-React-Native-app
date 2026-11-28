import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppColors } from '../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { songs } from '../data/songs';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import SearchPickerModal from './SearchPickerModal';

export default function SongPickerModal({ visible, onClose, songIds, onAdd, title = 'Add songs' }: {
  visible: boolean; onClose: () => void; songIds: string[]; onAdd: (id: string) => void; title?: string;
}) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  return <SearchPickerModal visible={visible} onClose={onClose} title={title} placeholder="Search songs or artists">
    {query => {
      const results = songs.filter(song => `${song.title} ${song.artist} ${song.genres.join(' ')}`.toLocaleLowerCase().includes(query));
      return <>
        {results.map(song => {
          const added = songIds.includes(song.id);
          return <View key={song.id} style={styles.row}>
            <Pressable style={styles.songLink} accessibilityRole="button" accessibilityLabel={`Open ${song.title} by ${song.artist}`} onPress={() => { onClose(); router.push({ pathname: '/song/[id]', params: { id: song.id } }); }}>
              <Image source={song.cover} style={styles.cover} accessible={false} />
              <View style={styles.copy}><Text numberOfLines={1} style={styles.song}>{song.title}</Text><Text numberOfLines={1} style={styles.artist}>{song.artist}</Text></View>
            </Pressable>
            <Pressable onPress={() => onAdd(song.id)} disabled={added} accessibilityRole="button" accessibilityLabel={added ? `${song.title}, already added` : `${title === 'Suggest a song' ? 'Suggest' : 'Add'} ${song.title}`} accessibilityState={{ disabled: added }} style={styles.iconButton}>
              <Ionicons name={added ? 'checkmark-circle' : 'add-circle'} size={25} color={added ? '#94877D' : colors.primary} />
            </Pressable>
          </View>;
        })}
        {results.length === 0 && <Text style={styles.note}>No songs found. Try another title or artist.</Text>}
      </>;
    }}
  </SearchPickerModal>;
}
const baseStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  songLink: { flex: 1, minWidth: 0, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cover: { width: 46, height: 46, borderRadius: 11 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  song: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  artist: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, paddingVertical: 20 },
});
