export type RoomSort = 'default' | 'participants-desc' | 'participants-asc' | 'genre';

const seedGenres: Record<string, string> = {
  'kitchen-disco': 'Disco · Pop',
  'late-nights': 'R&B · Soul',
  'on-repeat': 'Pop · Indie',
};

export function roomGenres(id: string, genre?: string) {
  return (genre ?? seedGenres[id] ?? 'Music').split('·').map(value => value.trim()).filter(Boolean);
}

export function discoverRooms<T extends { name: string; track: string; artist: string; listeners: number; genres: string[] }>(rooms: T[], query: string, genre: string, sort: RoomSort) {
  const search = query.trim().toLowerCase();
  const results = rooms.filter(room => (genre === 'all' || room.genres.includes(genre)) && (!search || [room.name, room.track, room.artist].some(value => value.toLowerCase().includes(search))));
  if (sort === 'participants-desc') results.sort((a, b) => b.listeners - a.listeners || a.name.localeCompare(b.name));
  if (sort === 'participants-asc') results.sort((a, b) => a.listeners - b.listeners || a.name.localeCompare(b.name));
  if (sort === 'genre') results.sort((a, b) => a.genres[0].localeCompare(b.genres[0]) || a.name.localeCompare(b.name));
  return results;
}
