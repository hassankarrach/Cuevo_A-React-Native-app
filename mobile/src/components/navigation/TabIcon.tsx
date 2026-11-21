import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/colors';

type TabIconProps = { name: 'home' | 'rooms' | 'playlists'; selected: boolean };

export default function TabIcon({ name, selected }: TabIconProps) {
  const color = selected ? colors.text : '#928B86';
  return (
    <View accessible={false} style={styles.icon}>
      <Ionicons name={name === 'home' ? 'home' : name === 'rooms' ? 'pulse' : 'albums'} size={23} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({ icon: { width: 25, height: 30, alignItems: 'center', justifyContent: 'center' } });
