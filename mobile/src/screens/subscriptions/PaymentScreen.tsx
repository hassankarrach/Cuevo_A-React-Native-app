import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Rect } from 'react-native-svg';

import { useBilling } from '../../state/BillingContext';
import { paymentSummary, validatePaymentForm } from '../../state/paymentMethods';
import { showToast } from '../../utils/toast';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { saveMethod } = useBilling();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  function save() {
    const validation = validatePaymentForm(name, number, expiry, cvv);
    if (validation) { setError(validation); return; }
    saveMethod(paymentSummary(number, expiry));
    setName(''); setNumber(''); setExpiry(''); setCvv(''); setError('');
    showToast('success', 'Payment method saved');
    if (from === 'subscription') router.dismissTo('/subscribe');
    else if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }
  const lastFour = number.replace(/\D/g, '').slice(-4);


  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <StatusBar style="dark" />
    <View style={styles.header}>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={23} color={colors.text} accessible={false} />
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>Add payment method</Text>
      <View style={styles.headerSpacer} />
    </View>
    <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 28 }]}>
        <View style={styles.paymentCard} accessible accessibilityLabel={`Payment card, ${lastFour.length === 4 ? `ending in ${lastFour}` : 'new card'}`}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Image source={require('../../../assets/cards/cih-sayidati-cover.png')} resizeMode="stretch" style={styles.cardCover} accessible={false} />
          </View>
          <View style={styles.cardBrandSpace} />
          <View style={styles.cardMiddle}>
            <Svg width={42} height={33} viewBox="0 0 42 33" accessible={false}>
              <Rect x="0.5" y="0.5" width="41" height="32" rx="6" fill="#F1D48A" stroke="#CFAB58" />
              <Path d="M14 1 V32 M28 1 V32 M1 11 H14 M1 22 H14 M28 11 H41 M28 22 H41 M14 16.5 H28" stroke="#C4A45A" strokeWidth="1" />
            </Svg>
            <Svg width={30} height={34} viewBox="0 0 30 34" accessible={false}>
              <Path d="M5 13 Q9 17 5 21 M12 8 Q20 17 12 26 M20 3 Q31 17 20 31" fill="none" stroke="#8F376A" strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.cardNumber}>••••  ••••  ••••  {lastFour.length === 4 ? lastFour : '••••'}</Text>
            <View style={styles.cardNameRow}>
              <Text numberOfLines={1} style={styles.cardName}>{name.trim() ? name.toUpperCase() : 'YOUR NAME'}</Text>
              <View style={styles.mastercard} accessible={false}><View style={styles.redCircle} /><View style={styles.goldCircle} /></View>
            </View>
          </View>
        </View>



        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Cardholder name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Name on card" accessibilityLabel="Cardholder name" autoCapitalize="words" autoCorrect={false} maxLength={60} style={styles.input} placeholderTextColor="#A19892" selectionColor={colors.primary} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Card number</Text>
            <TextInput value={number} onChangeText={text => setNumber(text.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim())} placeholder="0000 0000 0000 0000" accessibilityLabel="Card number" keyboardType="number-pad" autoComplete="off" maxLength={23} style={styles.input} placeholderTextColor="#A19892" selectionColor={colors.primary} />
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Expiry date</Text>
              <TextInput value={expiry} onChangeText={text => { const digits = text.replace(/\D/g, '').slice(0, 4); setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} placeholder="MM/YY" accessibilityLabel="Expiry date" keyboardType="number-pad" autoComplete="off" maxLength={5} style={styles.input} placeholderTextColor="#A19892" selectionColor={colors.primary} />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>CVV</Text>
              <TextInput value={cvv} onChangeText={text => setCvv(text.replace(/\D/g, '').slice(0, 4))} placeholder="•••" accessibilityLabel="Card security code" keyboardType="number-pad" autoComplete="off" secureTextEntry maxLength={4} style={styles.input} placeholderTextColor="#A19892" selectionColor={colors.primary} />
            </View>
          </View>
        </View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <View style={styles.saveButton}><PrimaryButton label="Save payment method" onPress={save} /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFCF8' },
  body: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 44 },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 21, color: colors.text },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 18 },
  paymentCard: { aspectRatio: 1.65, minHeight: 190, borderRadius: 26, padding: 22, overflow: 'hidden', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EBDDE7', backgroundColor: '#FFFFFF' },
  mastercard: { width: 43, height: 28, flexDirection: 'row', alignItems: 'center' },
  redCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F24B30' },
  goldCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFB323', marginLeft: -13, opacity: 0.9 },
  cardCover: { width: '100%', height: '100%' },
  cardBrandSpace: { height: 32 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardMiddle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  cardBottom: { gap: 7 },
  cardNumber: { fontFamily: fonts.medium, fontSize: 21, letterSpacing: 0.6, color: '#FFFFFF', textShadowColor: '#4E2148', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  cardName: { flex: 1, fontFamily: fonts.regular, fontSize: 12, letterSpacing: 1, color: '#FFFFFF', textShadowColor: '#4E2148', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  form: { padding: 18, borderRadius: 26, gap: 18, borderWidth: 1, borderColor: '#EEE5DB', backgroundColor: '#FFFFFF' },
  field: { gap: 8 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  input: { minHeight: 52, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 15, backgroundColor: '#F4F0EB', fontFamily: fonts.input, fontSize: 14, color: colors.text },
  fieldRow: { flexDirection: 'row', gap: 14 },
  half: { flex: 1, minWidth: 0 },
  error: { fontFamily: fonts.regular, fontSize: 12, color: '#B93D1B' },
  saveButton: { marginTop: 2 },
});
