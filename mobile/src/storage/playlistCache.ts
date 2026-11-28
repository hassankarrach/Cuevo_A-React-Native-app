import type { Playlist } from '../data/mockPlaylists';
import { openPlaylistDatabase } from './database';

type CachedPlaylistRow = {
  snapshot_json: string;
  server_revision: string | null;
  cached_at: string;
};

export async function savePlaylist(
  accountId: string,
  playlist: Playlist,
  serverRevision: string | null = null,
) {
  if (!accountId.trim()) throw new Error('An account ID is required to cache a playlist.');

  const snapshotJson = JSON.stringify(playlist);
  const cachedAt = new Date().toISOString();
  const database = await openPlaylistDatabase();

  await database.runAsync(
    `INSERT INTO cached_playlists
      (account_id, playlist_id, snapshot_json, server_revision, cached_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (account_id, playlist_id) DO UPDATE SET
      snapshot_json = excluded.snapshot_json,
      server_revision = excluded.server_revision,
      cached_at = excluded.cached_at`,
    accountId,
    playlist.id,
    snapshotJson,
    serverRevision,
    cachedAt,
  );
}

export async function getCachedPlaylist(accountId: string, playlistId: string) {
  if (!accountId.trim()) throw new Error('An account ID is required to read a cached playlist.');

  const database = await openPlaylistDatabase();
  const row = await database.getFirstAsync<CachedPlaylistRow>(
    `SELECT snapshot_json, server_revision, cached_at
     FROM cached_playlists
     WHERE account_id = ? AND playlist_id = ?`,
    accountId,
    playlistId,
  );

  if (!row) return null;

  let playlist: Playlist;
  try {
    playlist = JSON.parse(row.snapshot_json);
  } catch {
    return null;
  }
  return { playlist, serverRevision: row.server_revision, cachedAt: row.cached_at };
}
