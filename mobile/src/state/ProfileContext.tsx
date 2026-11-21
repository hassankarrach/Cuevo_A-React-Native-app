import { createContext, useContext, useState, type ReactNode } from 'react';

import type { AccountStatus } from '../components/AccountBadges';
import { getMockAccount } from '../data/mockAccounts';

export type LocalProfile = { displayName: string; username: string; bio: string; location: string; genres: string[]; avatarUri: string | null };
const self = getMockAccount('self')!;
const initialProfile: LocalProfile = { displayName: self.displayName, username: self.username, bio: self.bio, location: self.location, genres: self.genres, avatarUri: self.avatarUri };
const ProfileContext = createContext<{ profile: LocalProfile; accountStatus: AccountStatus; saveProfile: (profile: LocalProfile) => void } | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, saveProfile] = useState(initialProfile);
  return <ProfileContext.Provider value={{ profile, accountStatus: { verified: self.verified, subscriptionActive: self.subscriptionActive }, saveProfile }}>{children}</ProfileContext.Provider>;
}

export function useLocalProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required');
  return value;
}
