import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { useBilling } from '../../state/BillingContext';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import UtilityPage from '../settings/UtilityPage';
import PaymentMethodList from './PaymentMethodList';

export default function SubscribeScreen() {
  const { selectedMethod } = useBilling();
  const [error, setError] = useState('');
  return <UtilityPage title="Review subscription">
    <View style={styles.hero}>
      <View style={styles.sparkle}><Ionicons name="sparkles" size={30} color={colors.primary} accessible={false} /></View>
      <Text style={styles.eyebrow}>YOUR UPGRADE</Text>
      <Text accessibilityRole="header" style={styles.title}>Cuevo Plus</Text>
      <Text style={styles.description}>More room for music and the people you love.</Text>
      <View style={styles.priceRow}><Text style={styles.price}>99</Text><Text style={styles.currency}>DH</Text></View>
    </View>
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>Pay with</Text>
      <PaymentMethodList />
      <Pressable onPress={() => { setError(''); router.push({ pathname: '/payment', params: { from: 'subscription' } }); }} accessibilityRole="button" style={styles.add}>
        <Ionicons name="add-circle-outline" size={21} color={colors.primary} accessible={false} /><Text style={styles.addLabel}>Add payment method</Text>
      </Pressable>
    </View>
    <View style={styles.summary}>
      <View style={styles.summaryRow}><Text style={styles.description}>Cuevo Plus</Text><Text style={styles.amount}>99 DH</Text></View>
      <View style={styles.divider} />
      <View style={styles.summaryRow}><Text style={styles.heading}>Total</Text><Text style={styles.total}>99 DH</Text></View>
    </View>
    <Text style={styles.note}>Review your plan and payment method before subscribing.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {selectedMethod ? <PrimaryButton label="Subscribe for 99 DH" onPress={() => {
      // No payment provider exists yet. Never claim payment success or grant entitlement locally.
      setError('Subscriptions are not available yet. Your card has not been charged.');
    }} /> : <PrimaryButton label="Add payment method" onPress={() => router.push({ pathname: '/payment', params: { from: 'subscription' } })} />}
  </UtilityPage>;
}
const styles = StyleSheet.create({
  hero: { alignItems: 'center', borderRadius: 26, padding: 24, backgroundColor: '#FFF0E4', borderWidth: 1, borderColor: '#FFE0CA', gap: 9 },
  sparkle: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#FFFFFF', marginBottom: 7 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.4, color: '#9A6147' },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 },
  price: { fontFamily: fonts.bold, fontSize: 44, color: colors.text },
  currency: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  section: { gap: 12, marginTop: 8 },
  heading: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  add: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.primary },
  summary: { padding: 18, borderWidth: 1, borderColor: '#EEE5DB', borderRadius: 20, backgroundColor: '#FFFFFF', gap: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: '#F1ECE6' },
  amount: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  total: { fontFamily: fonts.bold, fontSize: 21, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },
  error: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: '#B93D1B' },
});
