import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppColors } from '../../theme/useAppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { useBilling } from '../../state/BillingContext';
import PaymentMethodList from '../subscriptions/PaymentMethodList';
import PrimaryButton from '../../components/PrimaryButton';
import { useSettings, type PrivacySettings, type Visibility } from '../../state/SettingsContext';
import { showToast } from '../../utils/toast';
import ChangePasswordForm from './ChangePasswordForm';
import LinkedAccountsForm from './LinkedAccountsForm';
import UtilityPage from './UtilityPage';
import { settingsStyles as baseStyles } from './settingsStyles';

type Panel = 'password' | 'privacy' | 'accounts' | 'server' | 'payment';
export default function SettingsScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useAppColors();

  const { privacy, savePrivacy, serverAddress, saveServerAddress } = useSettings();
  const { methods } = useBilling();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [privacyDraft, setPrivacyDraft] = useState(privacy);
  const [address, setAddress] = useState(serverAddress);
  const [error, setError] = useState('');
  function toggle(next: Panel) {
    Keyboard.dismiss();
    setPanel(panel === next ? null : next);
    setPrivacyDraft(privacy); setAddress(serverAddress); setError('');
  }
  function row(title: string, subtitle: string, icon: ComponentProps<typeof Ionicons>['name'], onPress: () => void, expanded?: boolean) {
    return <Pressable accessibilityRole="button" accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={23} color={colors.text} accessible={false} />
      <View style={styles.rowCopy}><Text style={styles.heading}>{title}</Text><Text style={styles.note}>{subtitle}</Text></View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.textSecondary} accessible={false} />
    </Pressable>;
  }
  function saveAddress() {
    let normalized: string;
    try {
      const url = new URL(address.trim());
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash) throw new Error();
      normalized = url.toString().replace(/\/$/, '');
    } catch { setError('Enter an HTTP or HTTPS server address without credentials, query parameters or a fragment.'); return; }
    saveServerAddress(normalized); Keyboard.dismiss(); setPanel(null); showToast('success', 'Server address saved');
  }
  const privacyFields: { key: keyof PrivacySettings; label: string }[] = [{ key: 'bio', label: 'Bio' }, { key: 'location', label: 'Location' }, { key: 'genres', label: 'Music preferences' }];
  const options: { value: Visibility; label: string }[] = [{ value: 'public', label: 'Everyone' }, { value: 'friends', label: 'Friends' }, { value: 'private', label: 'Only you' }];
  return <UtilityPage title="Settings">
    <View style={styles.section}><Text style={styles.sectionLabel}>ACCOUNT</Text><View style={styles.card}>
      {row('Edit profile', 'Name, photo, bio and music preferences', 'person-circle', () => router.push('/profile'))}
      <View style={styles.divider} />
      {row('Change password', 'Update your account password', 'lock-closed', () => toggle('password'), panel === 'password')}
      {panel === 'password' && <ChangePasswordForm />}
      <View style={styles.divider} />
      {row('Linked accounts', 'Manage Google sign-in', 'link', () => toggle('accounts'), panel === 'accounts')}
      {panel === 'accounts' && <LinkedAccountsForm />}
    </View></View>
    <View style={styles.section}><Text style={styles.sectionLabel}>BILLING</Text><View style={styles.card}>
      {row('Cuevo Plus', 'Explore your upgrade · 99 DH', 'sparkles', () => router.push('/subscription'))}
      <View style={styles.divider} />
      {row('Payment methods', methods.length ? `${methods.length} saved ${methods.length === 1 ? 'card' : 'cards'}` : 'Add a card to your account', 'card', () => toggle('payment'), panel === 'payment')}
      {panel === 'payment' && <View style={styles.form}>
        <PaymentMethodList removable />
        <PrimaryButton label="Add payment method" onPress={() => router.push('/payment')} />
      </View>}
    </View></View>
    <View style={styles.section}><Text style={styles.sectionLabel}>PRIVACY</Text><View style={styles.card}>
      {row('Profile visibility', 'Choose who sees your profile information', 'shield-checkmark', () => toggle('privacy'), panel === 'privacy')}
      {panel === 'privacy' && <View style={styles.form}>
        {privacyFields.map(field => <View key={field.key} style={styles.section}><Text style={styles.label}>{field.label}</Text><View accessibilityRole="radiogroup" style={styles.choices}>{options.map(option => <Pressable key={option.value} onPress={() => setPrivacyDraft(current => ({ ...current, [field.key]: option.value }))} accessibilityRole="radio" accessibilityLabel={`${field.label}: ${option.label}`} accessibilityState={{ checked: privacyDraft[field.key] === option.value }} style={[styles.choice, privacyDraft[field.key] === option.value && styles.selected]}><Text style={styles.choiceText}>{option.label}</Text></Pressable>)}</View></View>)}
        <PrimaryButton label="Save privacy" onPress={() => { savePrivacy(privacyDraft); setPanel(null); showToast('success', 'Privacy preferences saved'); }} />
      </View>}
    </View></View>
    <View style={styles.section}><Text style={styles.sectionLabel}>CONNECTION</Text><View style={styles.card}>
      {row('Server address', serverAddress || 'Configure the backend address', 'server', () => toggle('server'), panel === 'server')}
      {panel === 'server' && <View style={styles.form}><Text style={styles.note}>Enter the server URL supplied for your environment.</Text><TextInput keyboardAppearance={colors.dark ? 'dark' : 'light'} value={address} onChangeText={text => { setAddress(text); setError(''); }} placeholder="https://api.example.com" accessibilityLabel="Server address" keyboardType="url" autoCapitalize="none" autoCorrect={false} style={styles.input} selectionColor={colors.primary} />{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<PrimaryButton label="Save address" onPress={saveAddress} /></View>}
    </View></View>
  </UtilityPage>;
}
