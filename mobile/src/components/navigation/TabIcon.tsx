import { useThemedStyles } from '../../theme/useThemedStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useAppColors } from '../../theme/useAppColors';

type TabIconProps = { name: 'home' | 'rooms' | 'playlists'; selected: boolean };

export default function TabIcon({ name, selected }: TabIconProps) {
  const styles = useThemedStyles(baseStyles);

  const colors = useAppColors();
  const color = selected ? colors.text : '#928B86';
  return (
    <View accessible={false} style={styles.icon}>
      <Ionicons name={name === 'home' ? 'home' : name === 'rooms' ? 'pulse' : 'albums'} size={23} color={color} />
    </View>
  );
}

const baseStyles = StyleSheet.create({ icon: { width: 25, height: 30, alignItems: 'center', justifyContent: 'center' } });
