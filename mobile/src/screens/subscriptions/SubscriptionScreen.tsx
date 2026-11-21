import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, FeGaussianBlur, Filter, G, Path } from 'react-native-svg';

import { useBilling } from '../../state/BillingContext';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const benefits = [
  { icon: 'albums' as const, label: 'More space for your playlists' },
  { icon: 'radio' as const, label: 'More rooms to bring people together' },
  { icon: 'people' as const, label: 'All the ways you already collaborate' },
];

function SubscriptionBackground() {
  return <View pointerEvents="none" accessible={false} style={styles.background}>
    <Svg width="100%" height="100%" viewBox="0 0 400 780" preserveAspectRatio="none">
      <Defs>
        <Filter id="subscriptionClouds" x="-100%" y="-100%" width="300%" height="300%">
          <FeGaussianBlur stdDeviation="30" />
        </Filter>
      </Defs>
      <G filter="url(#subscriptionClouds)" fill="none" strokeLinecap="round">
        <Path d="M-35 320 C-14 210 -40 72 35 12 C70 -15 130 -15 162 -32" stroke="#FF8B4D" strokeWidth="90" opacity="0.65" />
        <Path d="M-30 170 C-40 70 -10 5 65 -18" stroke="#FFD576" strokeWidth="58" opacity="0.9" />
        <Path d="M432 260 C375 360 445 440 395 536 C365 597 327 622 251 642" stroke="#FF784D" strokeWidth="83" opacity="0.65" />
        <Path d="M440 480 C414 572 400 629 303 653" stroke="#FFD26D" strokeWidth="65" opacity="0.8" />
        <Path d="M-25 603 C34 646 71 622 121 655" stroke="#FFC5AA" strokeWidth="70" opacity="0.6" />
      </G>
    </Svg>
  </View>;
}

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { selectedMethod } = useBilling();
  return <View style={styles.screen}>
    <StatusBar style="dark" />
    <View style={styles.hero}>
      <SubscriptionBackground />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.heroSafe}>
        <View style={styles.closeRow}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} accessibilityRole="button" accessibilityLabel="Close Cuevo Plus" style={styles.close}>
            <Ionicons name="close" size={25} color={colors.text} accessible={false} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.heroContent}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color={colors.primary} accessible={false} />
            <Text style={styles.badgeLabel}>Cuevo Plus</Text>
          </View>
          <Text accessibilityRole="header" style={styles.headline}>More music.{'\n'}<Text style={styles.headlineAccent}>More together.</Text></Text>
          <Text style={styles.description}>A little more room for the music{'\n'}and the people you love.</Text>
          <View style={styles.benefits}>
            {benefits.map(benefit => <View key={benefit.icon} style={styles.benefit}>
              <Ionicons name={benefit.icon} size={18} color={colors.primary} accessible={false} />
              <Text style={styles.benefitLabel}>{benefit.label}</Text>
            </View>)}
          </View>
          <View style={styles.included}><Ionicons name="checkmark-circle" size={16} color="#9A6147" accessible={false} /><Text style={styles.includedLabel}>Everything in Free, with room for more.</Text></View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFCF8' },
  hero: { flex: 1, minHeight: 0, overflow: 'hidden' },
  background: { ...StyleSheet.absoluteFill, backgroundColor: '#FFFCF8' },
  heroSafe: { flex: 1 },
  closeRow: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 4 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 36 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: '#FFE1CE' },
  badgeLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  headline: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 46, letterSpacing: -1.5, color: colors.text, textAlign: 'center', marginTop: 24 },
  headlineAccent: { color: colors.primary },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textSecondary, textAlign: 'center', marginTop: 16 },
  benefits: { alignItems: 'center', gap: 12, marginTop: 30, width: '100%' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 9, maxWidth: '100%', minHeight: 42, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' },
  benefitLabel: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.text },
  included: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 24 },
  includedLabel: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: '#9A6147' },
  footer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 25, borderWidth: 1, borderColor: '#F3E8DD' },
  planBadge: { alignSelf: 'center', marginTop: -39, backgroundColor: '#FFF1E5', borderWidth: 1, borderColor: '#FFE0C6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 14 },
  planBadgeLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.2, color: '#A35D39' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 18 },
  price: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 58, letterSpacing: -2, color: colors.text },
  currency: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  planName: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 2, marginBottom: 22 },
});
