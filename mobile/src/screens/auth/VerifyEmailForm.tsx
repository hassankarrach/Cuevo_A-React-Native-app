import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { registrationError, resendRegistration, verifyRegistration, type RegistrationChallenge } from '../../api/registration';
import { ApiError } from '../../api/client';
import AuthField from './AuthField';
import { authFlowStyles as styles } from './authFlowStyles';

export default function VerifyEmailForm({ challenge, onVerified }: { challenge: RegistrationChallenge; onVerified: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState(challenge);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [retryAt, setRetryAt] = useState(0);
  const remaining = Math.max(0, Math.ceil((Math.max(Date.parse(activeChallenge.resendAvailableAt), retryAt) - now) / 1000));
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function resend() {
    if (pending.current || Date.now() < Math.max(Date.parse(activeChallenge.resendAvailableAt), retryAt)) return;
    pending.current = true;
    setResending(true);
    setError('');
    setNotice('');
    try {
      const replacement = await resendRegistration(activeChallenge);
      if (mounted.current) {
        setActiveChallenge(replacement);
        setCode('');
        setNotice('A new code has been requested. Check your inbox.');
      }
    } catch (error) {
      if (mounted.current) {
        setError(registrationError(error));
        if (error instanceof ApiError && error.retryAfterSeconds) setRetryAt(Date.now() + error.retryAfterSeconds * 1000);
      }
    } finally {
      pending.current = false;
      if (mounted.current) { setResending(false); setNow(Date.now()); }
    }
  }
  async function verify() {
    if (pending.current) return;
    const invalid = !/^\d{6}$/.test(code) ? 'Enter the 6-digit code.'
      : Date.now() >= Date.parse(activeChallenge.expiresAt) ? 'This code has expired. Request a new code below.' : '';
    setError(invalid);
    if (invalid) return;
    Keyboard.dismiss();
    pending.current = true;
    setSubmitting(true);
    try {
      await verifyRegistration(activeChallenge, code);
      if (mounted.current) { setCode(''); setVerified(true); }
    } catch (error) {
      if (mounted.current) setError(registrationError(error));
    } finally {
      pending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }
  return <View style={styles.form}>
    <Image
      source={verified
        ? require('../../../assets/illustrations/cuevo-all-set.png')
        : require('../../../assets/illustrations/cuevo-verify-email.png')}
      style={illustrationStyles.artwork}
      resizeMode="contain"
      accessible={false}
    />
    <Text accessibilityRole="header" style={styles.heading}>{verified ? 'You’re all set.' : 'Make it official.'}</Text>
    {verified ? <>
      <Text style={styles.description}>Your email is verified. Log in to continue setting up your account.</Text>
      <PrimaryButton label="Continue to log in" onPress={onVerified} />
    </> : <>
      <Text style={styles.description}>Enter the 6-digit verification code for <Text style={styles.email}>{challenge.maskedEmail}</Text>.</Text>
      <View pointerEvents={submitting || resending ? 'none' : 'auto'}>
      <AuthField label="Verification code" kind="code" value={code} onChangeText={value => { setCode(value); setError(''); }} error={error} />
      </View>
      <PrimaryButton label={submitting ? 'Verifying…' : 'Verify email'} disabled={submitting || resending} onPress={verify} />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting || resending || remaining > 0 }}
        disabled={submitting || resending || remaining > 0} onPress={resend} style={styles.link}>
        <Text style={[styles.linkText, (submitting || resending || remaining > 0) && styles.muted]}>
          {resending ? 'Sending…' : remaining > 0 ? `Resend code in ${remaining}s` : 'Resend code'}
        </Text>
      </Pressable>
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.description}>{notice}</Text> : null}
    </>}
  </View>;
}

const illustrationStyles = StyleSheet.create({
  artwork: { width: 220, height: 150, alignSelf: 'center' },
});
