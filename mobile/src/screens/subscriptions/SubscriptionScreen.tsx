import { useThemedStyles } from '../../theme/useThemedStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SubscriptionBackground from './SubscriptionBackground';

import { useBilling } from '../../state/BillingContext';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

// Illustration controls — save this file to see changes with Fast Refresh.
const illustrationLayout = {
  scale: 1.3,       // 1 = current size; 1.2 = 20% larger
  x: 0,           // positive moves right; negative moves left
  y: 80,           // positive moves down; negative moves up
  rotation: 0,    // degrees, clockwise
  overlap: 64,    // how far the headline tucks beneath the illustration
};

// Headline controls — independent of the illustration and other content.
const headlineLayout = {
  x: 0,       // positive moves right; negative moves left
  y: -160,     // negative moves up; positive moves down
  scale: 1,   // size multiplier
};

const benefits = [
  { icon: 'albums' as const, label: 'More space for your playlists' },
  { icon: 'radio' as const, label: 'More rooms to bring people together' },
  { icon: 'people' as const, label: 'All the ways you already collaborate' },
];

export default function SubscriptionScreen() {
  const styles = useThemedStyles(baseStyles);

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const artworkSize = Math.min(width - 44, height * 0.26);
  const { selectedMethod } = useBilling();
  return <View style={styles.screen}>
    <StatusBar style="light" />
    <SubscriptionBackground />
    <View style={styles.hero}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.heroSafe}>
        <View style={styles.closeRow}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color={colors.primary} accessible={false} />
            <Text style={styles.badgeLabel}>Cuevo Plus</Text>
          </View>

          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} accessibilityRole="button" accessibilityLabel="Close Cuevo Plus" style={styles.close}>
            <Ionicons name="close" size={25} color="#FFFFFF" accessible={false} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.heroContent}>
          <Image source={require('../../../assets/illustrations/cuevo-plus-reaching.png')} accessible={false} resizeMode="contain" style={[styles.illustration, {
            width: artworkSize,
            height: artworkSize,
            marginBottom: -illustrationLayout.overlap,
            transform: [
              { translateX: illustrationLayout.x },
              { translateY: illustrationLayout.y },
              { rotate: `${illustrationLayout.rotation}deg` },
              { scale: illustrationLayout.scale },
            ],
          }]} />
          <Text accessibilityRole="header" style={[styles.headline, {
            transform: [
              { translateX: headlineLayout.x },
              { translateY: headlineLayout.y },
              { scale: headlineLayout.scale },
            ],
          }]}>More music.{'\n'}<Text style={styles.headlineAccent}>More together.</Text></Text>
          <View style={styles.benefits}>
            {benefits.map(benefit => <View key={benefit.icon} style={styles.benefit}>
              <Ionicons name={benefit.icon} size={18} color={colors.primary} accessible={false} />
              <Text style={styles.benefitLabel}>{benefit.label}</Text>
            </View>)}
          </View>
          <View style={styles.included}><Ionicons name="checkmark-circle" size={16} color="#FFD2B5" accessible={false} /><Text style={styles.includedLabel}>Everything in Free, with room for more.</Text></View>
        </ScrollView>
      </SafeAreaView>
    </View>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 12, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
      <View style={styles.planBadge}><Text style={styles.planBadgeLabel}>YOUR NEXT UPGRADE</Text></View>
      <View style={styles.priceRow}><Text style={styles.price}>99</Text><Text style={styles.currency}>DH</Text></View>
      <Text style={styles.planName}>Cuevo Plus</Text>
      <PrimaryButton label="Continue" onPress={() => selectedMethod ? router.push('/subscribe') : router.push({ pathname: '/payment', params: { from: 'subscription' } })} showArrow />
    </View>
  </View>;
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFCF8' },
  hero: { flex: 1, minHeight: 0, overflow: 'hidden' },
  heroSafe: { flex: 1 },
  closeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 16, paddingTop: 4 },
  close: { position: 'absolute', right: 16, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 22, paddingTop: 0, paddingBottom: 36 },
  illustration: { zIndex: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: '#FFE1CE' },
  badgeLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  headline: { zIndex: 2, fontFamily: fonts.bold, fontSize: 38, lineHeight: 46, letterSpacing: -1.5, color: '#FFFFFF', textAlign: 'center', marginTop: 0 },
  headlineAccent: { color: '#FFD2B5' },
  benefits: { alignItems: 'stretch', gap: 8, marginTop: 'auto', paddingTop: 18, width: '100%' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 9, width: '100%', minHeight: 42, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' },
  benefitLabel: { flex: 1, textAlign: 'left', fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.text },
  included: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16 },
  includedLabel: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: '#FFD2B5' },
  footer: { backgroundColor: 'rgba(255,255,255,0.94)', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 25, borderWidth: 1, borderColor: '#F3E8DD' },
  planBadge: { alignSelf: 'center', marginTop: -39, backgroundColor: '#FFF1E5', borderWidth: 1, borderColor: '#FFE0C6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 14 },
  planBadgeLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.2, color: '#A35D39' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 18 },
  price: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 58, letterSpacing: -2, color: colors.text },
  currency: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  planName: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 2, marginBottom: 22 },
});
