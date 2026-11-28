import { ApiError, type RequestOptions } from './client';
import type { LocalProfile } from '../state/ProfileContext';

export type ProfileRequest = (path: string, options?: Omit<RequestOptions, 'accessToken'>) => Promise<unknown>;
export function parseProfile(value: unknown): LocalProfile {
  const data = value as Record<string, unknown> | null;
  if (!data || typeof data.displayName !== 'string' || typeof data.username !== 'string'
    || (data.avatarUrl !== null && (typeof data.avatarUrl !== 'string' || !/^\/api\/v1\/profiles\/[^/]+\/avatar$/.test(data.avatarUrl)))) {
    throw new ApiError('The service returned an unexpected profile.', 'INVALID_RESPONSE', 200);
  }
  return { displayName: data.displayName, username: data.username, bio: typeof data.bio === 'string' ? data.bio : '',
    location: typeof data.location === 'string' ? data.location : '',
    genres: Array.isArray(data.preferredGenres) ? data.preferredGenres.filter((genre): genre is string => typeof genre === 'string') : [],
    avatarUri: data.avatarUrl as string | null };
}
export async function readProfile(request: ProfileRequest): Promise<LocalProfile | null> {
  let profile;
  try { profile = parseProfile(await request('/api/v1/me/profile')); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  if (profile.avatarUri) profile.avatarUri = await request(profile.avatarUri, { responseType: 'image' }) as string;
  return profile;
}
export async function saveSetup(request: ProfileRequest, name: string, username: string, photo: string | null, removePhoto: boolean) {
  const profile = parseProfile(await request('/api/v1/me/profile', { method: 'PATCH', body: { displayName: name.trim(), username: username.trim().toLowerCase() } }));
  if (photo) {
    const binary = atob(photo);
    if (binary.length > 2 * 1024 * 1024) throw new Error('Choose a photo smaller than 2 MB.');
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    await request('/api/v1/me/avatar', { method: 'PUT', rawBody: bytes.buffer, contentType: 'image/jpeg' });
    profile.avatarUri = `data:image/jpeg;base64,${photo}`;
  } else if (removePhoto) {
    await request('/api/v1/me/avatar', { method: 'DELETE' });
    profile.avatarUri = null;
  }
  return profile;
}
