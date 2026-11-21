import { Text, View } from 'react-native';
import UtilityPage from './UtilityPage';
import { settingsStyles as styles } from './settingsStyles';
const topics = [
  ['About Cuevo', 'Choose what plays next and build playlists together. Cuevo combines cue/queue + vote.'],
  ['Join a room', 'Browse Rooms to open a public room, then choose Join. With an invitation, tap + and enter the six-character room code.'],
  ['Suggest and vote', 'Suggest a song to the queue. You get one upvote or downvote per queued song and can change or withdraw it. Higher scores move songs earlier. Ties keep suggestion order, and the current song stays pinned.'],
  ['Host controls', 'The host starts, pauses and skips playback, and can remove songs. Queue order is decided by votes. When the queue finishes, the room stays open; more songs wait for the host to start again.'],
  ['Ended rooms', 'When the host ends a room, you can still view it. Joining, suggestions, votes and playback are closed.'],
  ['Collaborative playlists', 'Create a playlist from +, then add songs from the catalog. Owners can edit its name, description, visibility and who can change songs.'],
  ['Account and privacy', 'Open Settings to edit your profile, change your password and choose visibility for your bio, location and music preferences.'],
];
export default function HelpScreen() {
  return <UtilityPage title="Help & about">{topics.map(([title, body]) => <View key={title} style={[styles.card, styles.form]}><Text style={styles.heading}>{title}</Text><Text style={styles.note}>{body}</Text></View>)}</UtilityPage>;
}
