import { getSong, songs } from '../data/songs';

export type Vote = -1 | 0 | 1;
export type QueueTrack = { id: string; songId?: string; title: string; artist: string; addedBy: string; duration: string; tint: string; order: number; score: number; vote: Vote };
export type Playback = { tracks: QueueTrack[]; currentId: string | null; isPlaying: boolean; elapsed: number; ended: boolean; nextOrder: number };
const samples = [
  { cover: undefined, title: 'Levitating', artist: 'Dua Lipa', addedBy: 'Adam', duration: '3:23', tint: '#F6BD86' },
  { cover: require('../../assets/covers/catalog/blinding-lights.jpg'), title: 'Blinding Lights', artist: 'The Weeknd', addedBy: 'Sara', duration: '3:20', tint: '#EAB2A0' },
  { cover: require('../../assets/covers/catalog/get-lucky.jpg'), title: 'Get Lucky', artist: 'Daft Punk', addedBy: 'Yassine', duration: '6:09', tint: '#D9C691' },
  { cover: require('../../assets/covers/catalog/golden.jpg'), title: 'Golden', artist: 'Harry Styles', addedBy: 'Lina', duration: '3:28', tint: '#E8D49A' },
  { cover: undefined, title: 'Pink + White', artist: 'Frank Ocean', addedBy: 'Omar', duration: '3:04', tint: '#C5C9DF' },
];
const suggestion = { cover: require('../../assets/covers/catalog/one-more-time.jpg'), title: 'One More Time', artist: 'Daft Punk', duration: '5:20', tint: '#BBD8D0' };

// Queue-entry IDs identify votes/removals; song-page IDs identify the recording.
export function queueSongId(track: { title: string; artist: string; songId?: string }) {
  return track.songId ?? songs.find(song => song.title === track.title && song.artist === track.artist)?.id
    ?? `queue-${`${track.artist}-${track.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function getQueueSong(id: string) {
  return [...samples, suggestion].find(track => queueSongId(track) === id);
}
export function initialPlayback(index?: number): Playback {
  const tracks = index === undefined ? [] : [samples[index], ...samples.filter((_, i) => i !== index)].map((track, order) => ({ ...track, id: `seed-${order}`, order, score: [0, 14, 9, 6, 3][order], vote: 0 as Vote }));
  return { tracks, currentId: tracks[0]?.id ?? null, isPlaying: !!tracks.length, elapsed: 0, ended: false, nextOrder: tracks.length };
}
export function rankedTracks(state: Playback) {
  return [...state.tracks].sort((a, b) => a.id === state.currentId ? -1 : b.id === state.currentId ? 1 : (b.score + b.vote) - (a.score + a.vote) || a.order - b.order);
}
export function playbackDuration(duration?: string) {
  if (!duration) return 0;
  const [minutes, seconds] = duration.split(':').map(Number);
  const total = minutes * 60 + seconds;
  return Number.isFinite(total) && total > 0 ? total : 0;
}
export type QueueAction = { type: 'vote'; id: string; vote: Vote } | { type: 'suggest'; songId: string; addedBy: string } | { type: 'remove'; id: string } | { type: 'seek'; seconds: number } | { type: 'toggle' | 'next' | 'end' | 'tick' };
export function updatePlayback(state: Playback, action: QueueAction, role: string): Playback {
  if (state.ended || role === 'visitor') return state;
  if (action.type === 'vote') return { ...state, tracks: state.tracks.map(track => track.id === action.id && track.id !== state.currentId ? { ...track, vote: action.vote } : track) };
  if (action.type === 'suggest') {
    const song = getSong(action.songId);
    if (!song || state.tracks.some(track => queueSongId(track) === song.id)) return state;
    return { ...state, nextOrder: state.nextOrder + 1, tracks: [...state.tracks, {
      id: `suggestion-${state.nextOrder}`, songId: song.id, title: song.title, artist: song.artist,
      duration: song.duration, tint: '#BBD8D0', addedBy: action.addedBy,
      order: state.nextOrder, score: 0, vote: 0,
    }] };
  }
  // Playback advancement is also used by the local playback clock for participant rooms.
  if (action.type === 'tick') {
    if (!state.isPlaying || !state.currentId) return state;
    const track = state.tracks.find(track => track.id === state.currentId);
    if (!track) return state;
    const [minutes, seconds] = track.duration.split(':').map(Number);
    if (state.elapsed + 1 < minutes * 60 + seconds) return { ...state, elapsed: state.elapsed + 1 };
    return advance(state);
  }
  if (role !== 'host') return state;
  if (action.type === 'seek') {
    const track = state.tracks.find(track => track.id === state.currentId);
    const duration = playbackDuration(track?.duration);
    if (!track || !duration || !Number.isFinite(action.seconds)) return state;
    return { ...state, elapsed: Math.max(0, Math.min(duration - 1, Math.floor(action.seconds))) };
  }
  if (action.type === 'end') return { ...state, ended: true, isPlaying: false };
  if (action.type === 'toggle') {
    const currentId = state.currentId ?? rankedTracks(state)[0]?.id ?? null;
    return { ...state, currentId, isPlaying: !!currentId && !state.isPlaying };
  }
  if (action.type === 'next') return state.currentId ? advance(state) : state;
  if (action.type === 'remove') {
    if (action.id === state.currentId) return advance(state);
    return { ...state, tracks: state.tracks.filter(track => track.id !== action.id) };
  }
  return state;
}
function advance(state: Playback): Playback {
  const tracks = rankedTracks(state).filter(track => track.id !== state.currentId);
  return { ...state, tracks, currentId: tracks[0]?.id ?? null, isPlaying: tracks.length > 0 && state.isPlaying, elapsed: 0 };
}
