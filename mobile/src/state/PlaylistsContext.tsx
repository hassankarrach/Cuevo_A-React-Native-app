import { createContext, useContext, useState, type ReactNode } from 'react';
import { mockPlaylists, canEditPlaylistSongs, type PlaylistDetails, type Playlist } from '../data/mockPlaylists';
import { getSong } from '../data/songs';

const PlaylistsContext = createContext<{
  playlists: Playlist[];
  editPlaylist: (id: string, details: PlaylistDetails) => void;
  createPlaylist: (name: string) => string;
  addSong: (playlistId: string, songId: string) => void;
  removeSong: (playlistId: string, songId: string) => void;
  moveSong: (playlistId: string, songId: string, direction: -1 | 1) => void;
} | null>(null);

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState(mockPlaylists);
  function createPlaylist(name: string) {
    const id = `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const playlist: Playlist = { id, name: name.trim(), description: '', creatorId: 'self', collaboratorIds: ['self'], private: true, songIds: [] };
    setPlaylists(current => [playlist, ...current]);
    return id;
  }
  function editPlaylist(id: string, details: PlaylistDetails) {
    const name = details.name.trim();
    if (!name || name.length > 60 || details.description.trim().length > 300) return;
    setPlaylists(current => current.map(playlist => playlist.id === id && playlist.creatorId === 'self' ? {
      ...playlist, ...details, name, description: details.description.trim(),
      editPolicy: details.private && details.editPolicy === 'everyone' ? 'collaborators' : details.editPolicy,
    } : playlist));
  }
  function updateSongs(id: string, update: (ids: string[]) => string[]) {
    setPlaylists(current => current.map(playlist => playlist.id === id && canEditPlaylistSongs(playlist) ? { ...playlist, songIds: update(playlist.songIds) } : playlist));
  }
  function addSong(playlistId: string, songId: string) {
    if (!getSong(songId)) return;
    updateSongs(playlistId, ids => ids.includes(songId) ? ids : [...ids, songId]);
  }
  function removeSong(playlistId: string, songId: string) {
    updateSongs(playlistId, ids => ids.filter(id => id !== songId));
  }
  function moveSong(playlistId: string, songId: string, direction: -1 | 1) {
    updateSongs(playlistId, ids => {
      const index = ids.indexOf(songId), target = index + direction;
      if (index < 0 || target < 0 || target >= ids.length) return ids;
      const reordered = [...ids];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  }
  return <PlaylistsContext.Provider value={{ playlists, editPlaylist, createPlaylist, addSong, removeSong, moveSong }}>{children}</PlaylistsContext.Provider>;
}
export function usePlaylists() {
  const value = useContext(PlaylistsContext);
  if (!value) throw new Error('PlaylistsProvider is required');
  return value;
}
