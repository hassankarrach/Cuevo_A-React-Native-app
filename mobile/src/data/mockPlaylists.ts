import { songs } from './songs';

export type Playlist = {
  id: string; name: string; description: string; creatorId: string; collaboratorIds: string[];
  private: boolean; editPolicy?: 'owner' | 'collaborators' | 'everyone'; songIds: string[];
};
// Home intentionally lists both public and private playlists; locks identify private items.
export const mockPlaylists: Playlist[] = [
  { id: 'inner-circle', name: 'Inner Circle', description: 'A quiet mix shared with close friends.', creatorId: 'sara', collaboratorIds: ['sara', 'omar', 'ines'], private: true,
    songIds: songs.filter(song => song.genres.includes('R&B') || song.genres.includes('Soul')).map(song => song.id) },
  { id: 'late-night-drives', name: 'Late Night Drives', description: 'Warm vocals and a soundtrack for the long way home.', creatorId: 'adam', collaboratorIds: ['adam', 'self', 'sara', 'omar'], private: false,
    songIds: songs.filter(song => song.genres.includes('R&B') || song.genres.includes('Indie')).map(song => song.id) },
  { id: 'weekend-together', name: 'Weekend Together', description: 'Good company. A little louder. Build the weekend together.', creatorId: 'sara', collaboratorIds: ['sara', 'self', 'yassine', 'lina', 'adam'], private: false,
    songIds: songs.filter(song => song.genres.includes('Pop') || song.genres.includes('House') || song.genres.includes('Afrobeats')).map(song => song.id) },
  { id: 'our-secret-mix', name: 'Our Secret Mix', description: 'Our favorite chants and songs from home.', creatorId: 'self', collaboratorIds: ['self', 'adam', 'sara'], private: true,
    songIds: songs.filter(song => song.artist === 'Labess' || song.artist === 'Winners 2005').map(song => song.id) },
];

export function playlistEditPolicy(playlist: Playlist) {
  return playlist.editPolicy ?? (playlist.private ? 'collaborators' : 'everyone');
}
export function canEditPlaylistSongs(playlist: Playlist) {
  if (playlist.creatorId === 'self') return true;
  const policy = playlistEditPolicy(playlist);
  return policy === 'everyone' && !playlist.private || policy === 'collaborators' && playlist.collaboratorIds.includes('self');
}
export type PlaylistDetails = Pick<Playlist, 'name' | 'description' | 'private'> & { editPolicy: 'owner' | 'collaborators' | 'everyone' };
