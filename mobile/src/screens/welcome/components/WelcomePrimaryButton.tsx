import { StyleSheet, View } from 'react-native';

import PrimaryButton from '../../../components/PrimaryButton';

export default function WelcomePrimaryButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.shadow}>
      <PrimaryButton label="Get started" showArrow onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 15,
    boxShadow: '0px 8px 20px rgba(35, 27, 24, 0.18)',
  },
});
