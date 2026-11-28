import { useTheme } from './ThemeContext';
import { usePathname } from 'expo-router';
import { colors } from './colors';

export const lightColors = { ...colors, dark: false, surface: '#FFFFFF', canvas: '#FFFCF8', border: '#EEEAE4', mutedSurface: '#F1EEEA', glass: 'rgba(255,255,255,0.22)', glassBorder: 'rgba(255,255,255,0.95)', selected: 'rgba(255,255,255,0.75)', skeleton: '#DED8D1', skeletonBanner: '#EEE9E3' };
export const darkColors = { ...lightColors, dark: true, background: '#0C0D0C', text: '#F5F5F5', textSecondary: '#B8B8B8', surface: '#161616', canvas: '#0C0D0C', border: '#2B2B2B', mutedSurface: '#242424', glass: 'rgba(22,22,22,0.88)', glassBorder: 'rgba(255,255,255,0.13)', selected: 'rgba(255,255,255,0.10)', skeleton: '#363636', skeletonBanner: '#202020' };
export type AppColors = { [K in keyof typeof lightColors]: K extends 'dark' ? boolean : string };

// Onboarding and its authentication forms keep their established light appearance.
export function useAppColors(): AppColors {
  const pathname = usePathname();
  const { theme } = useTheme();
  return ['/', '/introduction', '/notification-permission'].includes(pathname) || theme === 'light' ? lightColors : darkColors;
}
