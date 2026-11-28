import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { AccountStatus } from '../components/AccountBadges';
import { getMockAccount } from '../data/mockAccounts';
import { useAuth } from './AuthContext';
import { readProfile } from '../api/profile';

export type LocalProfile = { displayName: string; username: string; bio: string; location: string; genres: string[]; avatarUri: string | null };
const self = getMockAccount('self')!;
const initialProfile: LocalProfile = { displayName: self.displayName, username: self.username, bio: self.bio, location: self.location, genres: self.genres, avatarUri: self.avatarUri };
const ProfileContext = createContext<{ profile: LocalProfile; accountStatus: AccountStatus; saveProfile: (profile: LocalProfile) => void } | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { account, request } = useAuth();
  const accountId = account?.id;
  const [profile, saveProfile] = useState<LocalProfile>(account ? { displayName: '', username: '', bio: '', location: '', genres: [], avatarUri: null } : initialProfile);
  useEffect(() => {
    let active = true;
    if (accountId) void readProfile(request).then(saved => { if (active && saved) saveProfile(saved); }).catch(() => undefined);
    return () => { active = false; };
  }, [accountId, request]);
  return <ProfileContext.Provider value={{ profile, accountStatus: { verified: account ? false : self.verified, subscriptionActive: account ? false : self.subscriptionActive }, saveProfile }}>{children}</ProfileContext.Provider>;
}

export function useLocalProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required');
  return value;
}
