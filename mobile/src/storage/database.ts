import { openDatabaseAsync } from 'expo-sqlite';

// SQLite creates this file in the app's private storage if it doesn't exist.
export async function openPlaylistDatabase() {
  const database = await openDatabaseAsync('cuevo-playlists.db');

  // One saved snapshot per playlist and account. Opening again keeps existing rows.
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_playlists (
      account_id TEXT NOT NULL,
      playlist_id TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      server_revision TEXT,
      cached_at TEXT NOT NULL,
      PRIMARY KEY (account_id, playlist_id)
    );
  `);

  return database;
}
