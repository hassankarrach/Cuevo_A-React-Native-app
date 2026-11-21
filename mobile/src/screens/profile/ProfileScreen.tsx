import { useLocalSearchParams } from 'expo-router';
import OtherProfileScreen from './OtherProfileScreen';
import OwnProfileScreen from './OwnProfileScreen';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  return !userId || userId === 'self'
    ? <OwnProfileScreen />
    : <OtherProfileScreen key={userId} userId={userId} />;
}
