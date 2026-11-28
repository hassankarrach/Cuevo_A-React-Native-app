import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useBilling } from '../../state/BillingContext';
import { isPaymentMethodExpired } from '../../state/paymentMethods';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function PaymentMethodList({ removable = false }: { removable?: boolean }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const { methods, selectedId, selectMethod, removeMethod } = useBilling();
  return <View style={styles.list}>
    {methods.length === 0 && <Text style={styles.note}>No payment methods added yet.</Text>}
    {methods.map(method => {
      const expired = isPaymentMethodExpired(method);
      const selected = method.id === selectedId;
      return <View key={method.id} style={[styles.card, selected && styles.selected]}>
        <Pressable disabled={expired} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: expired }} accessibilityLabel={`${method.brand} ending in ${method.lastFour}, expires ${method.expiryMonth}/${method.expiryYear}${expired ? ', expired' : ''}`} onPress={() => selectMethod(method.id)} style={styles.method}>
          <View style={styles.icon}><Ionicons name="card" size={23} color={colors.primary} accessible={false} /></View>
          <View style={styles.copy}>
            <Text style={styles.title}>{method.brand} · •••• {method.lastFour}</Text>
            <Text style={styles.note}>{expired ? 'Expired' : 'Expires'} {String(method.expiryMonth).padStart(2, '0')}/{String(method.expiryYear).slice(-2)}{selected ? ' · Selected' : ''}</Text>
          </View>
          {selected && <Ionicons name="checkmark-circle" size={21} color={colors.primary} accessible={false} />}
        </Pressable>
        {removable && <Pressable style={styles.remove} accessibilityRole="button" accessibilityLabel={`Remove ${method.brand} ending in ${method.lastFour}`} onPress={() => Alert.alert('Remove payment method?', `${method.brand} ending in ${method.lastFour}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeMethod(method.id) }])}><Ionicons name="trash-outline" size={18} color={colors.textSecondary} accessible={false} /></Pressable>}
      </View>;
    })}
  </View>;
}
const baseStyles = StyleSheet.create({
  list: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE5DB', borderRadius: 18, backgroundColor: '#FFFFFF' },
  selected: { borderColor: '#FFB493', backgroundColor: '#FFF5ED' },
  method: { flex: 1, minWidth: 0, minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFE7D8', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  note: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.textSecondary },
  remove: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
