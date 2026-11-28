import { getSong } from '../data/songs';

export type PlaylistPalette = { base: string; shadow: string; forest: string; leaf: string };

// Keep the approved mesh geometry; these four colors control each genre's theme.
export const playlistGenrePalettes: Record<string, PlaylistPalette> = {
  Pop: { base: '#073430', shadow: '#010D0C', forest: '#377B47', leaf: '#6DB34C' },
  'Hip-hop': { base: '#3B190C', shadow: '#120703', forest: '#AB481F', leaf: '#DF893B' },
  'R&B': { base: '#30163F', shadow: '#0D0614', forest: '#74418F', leaf: '#AD6DC5' },
  House: { base: '#102B4C', shadow: '#030C19', forest: '#326BA3', leaf: '#62A9D5' },
  Rock: { base: '#40151B', shadow: '#140407', forest: '#A43742', leaf: '#D76B5B' },
  Jazz: { base: '#39280E', shadow: '#100B03', forest: '#93712E', leaf: '#C9A453' },
  Afrobeats: { base: '#3D260B', shadow: '#140B02', forest: '#AB6B20', leaf: '#DCAD42' },
  Indie: { base: '#202548', shadow: '#070916', forest: '#565F9E', leaf: '#9499CA' },
  World: { base: '#083B3C', shadow: '#020F10', forest: '#287D78', leaf: '#65B5A3' },
  'Fitness & Workout': { base: '#41200D', shadow: '#140902', forest: '#B55320', leaf: '#EC923F' },
};

export function getPlaylistTheme(songIds: readonly string[]) {
  const counts = new Map<string, number>();
  // A track contributes once to each of its curated genres; repeated IDs count once.
  for (const id of new Set(songIds)) {
    for (const genre of new Set(getSong(id)?.genres ?? [])) {
      const category = genre === 'Worldwide' ? 'World' : genre;
      if (playlistGenrePalettes[category]) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  // Alphabetical tie-breaking keeps the theme stable when songs are reordered.
  const genre = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b))[0] ?? 'Pop';
  return { genre, palette: playlistGenrePalettes[genre] };
}
