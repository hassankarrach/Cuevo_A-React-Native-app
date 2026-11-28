import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { SessionManager } from '../api/session';

const key = 'cuevo.auth.session.v1';
// Browser preview uses memory only; never fall back to localStorage for tokens.
let browserSession: string | null = null;
const storage = {
  read: async () => Platform.OS === 'web' ? browserSession : SecureStore.getItemAsync(key),
  write: async (value: string) => {
    if (Platform.OS === 'web') { browserSession = value; return; }
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  remove: async () => {
    if (Platform.OS === 'web') { browserSession = null; return; }
    await SecureStore.deleteItemAsync(key);
  },
};
const Context = createContext<SessionManager | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [manager] = useState(() => new SessionManager(storage, process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '') ?? ''));
  useEffect(() => {
    void manager.initialize();
    const check = () => { void manager.checkSession().catch(() => undefined); };
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') check(); }, 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [manager]);
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}
export function useAuth() {
  const manager = useContext(Context);
  if (!manager) throw new Error('AuthProvider is required');
  const snapshot = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  return { ...snapshot, login: manager.login, changePassword: manager.changePassword, googleLogin: manager.googleLogin, linkGoogle: manager.linkGoogle, unlinkGoogle: manager.unlinkGoogle, logout: manager.logout, retry: manager.initialize, request: manager.authenticatedRequest, completeProfile: manager.completeProfile };
}
