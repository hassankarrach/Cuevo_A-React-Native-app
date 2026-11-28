import Storage from 'expo-sqlite/kv-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

type Theme = 'light' | 'dark';
const THEME_KEY = 'cuevo.appearance';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function readTheme(): Theme {
  try {
    const saved = Platform.OS === 'web' ? globalThis.localStorage?.getItem(THEME_KEY) : Storage.getItemSync(THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const toggleTheme = useCallback(() => setTheme(current => current === 'dark' ? 'light' : 'dark'), []);
  useEffect(() => {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(THEME_KEY, theme);
      else Storage.setItemSync(THEME_KEY, theme);
    } catch (error) {
      console.warn('Could not save appearance preference', error);
    }
  }, [theme]);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is required');
  return value;
}
