import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

import type { Vote } from '../../../state/roomQueue';

// Local interaction preview; server membership and vote totals will be wired later.
export default function QueueVote({ score, song, vote, onVote, disabled = false }: { score: number; song: string; vote: Vote; onVote: (vote: Vote) => void; disabled?: boolean }) {
  return (
    <View style={styles.container}>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`Upvote ${song}`} accessibilityState={{ disabled, selected: vote === 1 }}
        onPress={() => onVote(vote === 1 ? 0 : 1)} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
        <Ionicons name="caret-up" size={23} color={vote === 1 ? colors.primary : '#A99C94'} accessible={false} />
      </Pressable>
      <Text accessibilityLabel={`${score + vote} votes`} style={[styles.score, vote !== 0 && styles.selectedScore]}>{score + vote}</Text>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`Downvote ${song}`} accessibilityState={{ disabled, selected: vote === -1 }}
        onPress={() => onVote(vote === -1 ? 0 : -1)} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
        <Ionicons name="caret-down" size={23} color={vote === -1 ? colors.primary : '#C5BCB5'} accessible={false} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#FFF6EE', borderWidth: 1, borderColor: '#F1E5D9', paddingVertical: 2 },
  arrow: { width: 44, height: 30, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.55 },
  score: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  selectedScore: { color: colors.primary },
});
