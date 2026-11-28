import { NavigationBar } from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { useAppColors } from '../theme/useAppColors';

export default function AndroidNavigationBar() {
  const colors = useAppColors();
  // Expo's native implementation treats "dark" as dark button content.
  return Platform.OS === 'android' ? <NavigationBar style={colors.dark ? 'light' : 'dark'} /> : null;
}
