import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type PrimaryButtonProps = {
  label: string;
  disabled?: boolean;
  onPress?: () => void;
  showArrow?: boolean;
};

export default function PrimaryButton({ label, disabled, onPress, showArrow = false }: PrimaryButtonProps) {
  return (
    <View style={styles.glow}>
      <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" style={styles.button}>
        <View pointerEvents="none" style={styles.bottomLight} />
        <Text style={styles.label}>{label}</Text>
        {showArrow && <View accessible={false} style={styles.arrow}>
          <View style={styles.arrowShaft} />
          <View style={styles.arrowHead} />
        </View>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: 15,
    boxShadow: '0px 5px 18px rgba(255, 77, 36, 0.22)',
  },
  button: {
    minHeight: 56,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    backgroundImage: 'linear-gradient(to bottom, #FF641F, #FF4D24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 191, 118, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  bottomLight: {
    ...StyleSheet.absoluteFill,
    backgroundImage:
      'radial-gradient(ellipse farthest-corner at 50% 125%, rgba(255, 223, 0, 1) 0%, rgba(255, 197, 0, 0.85) 14%, rgba(255, 157, 0, 0.3) 32%, rgba(255, 157, 0, 0) 55%)',
  },
  label: {
    fontSize: 17,
    fontFamily: fonts.semibold,
    color: '#FFFFFF',
  },
  arrow: {
    width: 22,
    height: 20,
    justifyContent: 'center',
  },
  arrowShaft: {
    width: 21,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  arrowHead: {
    position: 'absolute',
    right: 1,
    width: 11,
    height: 11,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
});
