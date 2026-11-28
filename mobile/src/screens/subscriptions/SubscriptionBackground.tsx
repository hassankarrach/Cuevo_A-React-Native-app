import { StyleSheet, View } from 'react-native';

// Layer broad, transparent color fields over charcoal to echo the portrait mesh.
export default function SubscriptionBackground() {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden style={styles.background}>
    <View style={[StyleSheet.absoluteFill, styles.orange]} />
    <View style={[StyleSheet.absoluteFill, styles.coral]} />
    <View style={[StyleSheet.absoluteFill, styles.cream]} />
    <View style={[StyleSheet.absoluteFill, styles.edge]} />
  </View>;
}

const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: '#202020' },
  orange: {
    backgroundImage: 'linear-gradient(to bottom, #FFE8C7 0%, #FFB18D 10%, #FF7147 22%, #F52C17 34%, #8D3023 46%, #372622 60%, #202020 74%)',
  },
  coral: {
    backgroundImage: 'radial-gradient(ellipse farthest-corner at 95% 27%, rgba(255,95,52,0.85) 0%, rgba(255,64,26,0.35) 25%, rgba(255,64,26,0) 57%)',
  },
  cream: {
    backgroundImage: 'radial-gradient(ellipse farthest-corner at 20% -8%, rgba(255,255,223,1) 0%, rgba(255,240,196,0.85) 12%, rgba(255,210,163,0.25) 27%, rgba(255,210,163,0) 44%)',
  },
  edge: {
    backgroundImage: 'linear-gradient(to right, rgba(255,231,179,0.24) 0%, rgba(255,201,127,0) 5%, rgba(255,201,127,0) 96%, rgba(255,223,166,0.15) 100%)',
  },
});
