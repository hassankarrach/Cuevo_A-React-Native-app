import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import AuthField from '../auth/AuthField';
import { passwordError } from '../auth/authValidation';
import PrimaryButton from '../../components/PrimaryButton';
import { settingsStyles as styles } from './settingsStyles';

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({ current: '', password: '', confirmation: '' });
  const [complete, setComplete] = useState(false);
  function save() {
    const next = { current: current ? '' : 'Enter your current password.', password: passwordError(password) || (current === password ? 'Choose a different password.' : ''), confirmation: confirmation && confirmation === password ? '' : 'Passwords don’t match.' };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    Keyboard.dismiss(); setCurrent(''); setPassword(''); setConfirmation(''); setComplete(true);
  }
  if (complete) return <View style={styles.form}><Text style={styles.heading}>Password updated</Text><Text style={styles.note}>Use your new password the next time you log in.</Text></View>;
  return <View style={styles.form}>
    <AuthField label="Current password" kind="password" currentPassword value={current} onChangeText={text => { setCurrent(text); setErrors(e => ({ ...e, current: '', password: '' })); }} error={errors.current} />
    <AuthField label="New password" kind="password" value={password} onChangeText={text => { setPassword(text); setErrors(e => ({ ...e, password: '', confirmation: '' })); }} error={errors.password} hint="Use at least 8 characters." />
    <AuthField label="Confirm new password" kind="password" value={confirmation} onChangeText={text => { setConfirmation(text); setErrors(e => ({ ...e, confirmation: '' })); }} error={errors.confirmation} />
    <PrimaryButton label="Update password" onPress={save} />
  </View>;
}
