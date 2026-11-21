import { createContext, useContext, useState, type ReactNode } from 'react';
export type Visibility = 'public' | 'friends' | 'private';
export type PrivacySettings = { bio: Visibility; location: Visibility; genres: Visibility };
const SettingsContext = createContext<{
  privacy: PrivacySettings; savePrivacy: (settings: PrivacySettings) => void;
  serverAddress: string; saveServerAddress: (address: string) => void;
} | null>(null);
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [privacy, savePrivacy] = useState<PrivacySettings>({ bio: 'public', location: 'friends', genres: 'public' });
  const [serverAddress, saveServerAddress] = useState('');
  return <SettingsContext.Provider value={{ privacy, savePrivacy, serverAddress, saveServerAddress }}>{children}</SettingsContext.Provider>;
}
export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('SettingsProvider is required');
  return settings;
}
