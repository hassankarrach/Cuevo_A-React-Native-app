import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import welcomeAnimation from '../../../assets/animations/cuevo-welcome.json';
import type { RegistrationChallenge } from '../../api/registration';
import { useAuth } from '../../state/AuthContext';
import AuthModal from '../auth/AuthModal';
import ForgotPasswordForm from '../auth/ForgotPasswordForm';
import ResetPasswordForm from '../auth/ResetPasswordForm';
import VerifyEmailForm from '../auth/VerifyEmailForm';
import SignUpForm from '../auth/SignUpForm';
import ProfileForm from '../auth/ProfileForm';
import { NotificationPermissionForm } from '../notifications/NotificationPermissionScreen';
import LoginForm from '../login/components/LoginForm';
import IllustrationEdgeBlur from './components/IllustrationEdgeBlur';
import WelcomeBackground from './components/WelcomeBackground';
import WelcomeContent, { WelcomeLogin } from './components/WelcomeContent';
import WelcomePrimaryButton from './components/WelcomePrimaryButton';
import WelcomeBrand from './components/WelcomeBrand';
import WelcomeCharacters from './components/WelcomeCharacters';

export default function WelcomeScreen() {
  const { account } = useAuth();
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'verify' | 'profile' | 'forgot' | 'reset' | 'notifications' | null>(account && !account.profileCompleted ? 'profile' : null);
  const [registration, setRegistration] = useState<RegistrationChallenge | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [resetChallenge, setResetChallenge] = useState({ email: '', resendAt: 0 });
  const titles = { login: 'Log in', signup: 'Create an account', verify: 'Verify your email', profile: 'Your profile', forgot: 'Forgot password', reset: 'Reset password', notifications: 'Stay in the loop' };
  const finishAccountSetup = useCallback(() => {
    router.push('/introduction');
  }, []);
  function goBack() {
    if (authMode === 'notifications') { setAuthMode('profile'); return; }
    if (authMode === 'forgot') setAuthMode('login');
    else if (authMode === 'reset') setAuthMode('forgot');
    else if (authMode === 'verify' || authMode === 'profile') setAuthMode('signup');
    else setAuthMode(null);
  }

  if (account?.profileCompleted && authMode !== 'profile' && authMode !== 'notifications') return <Redirect href="/home" />;

  return (
    <View style={styles.container}>
      <WelcomeBackground />
      <SafeAreaView style={styles.container} accessibilityElementsHidden={authMode !== null} importantForAccessibility={authMode !== null ? 'no-hide-descendants' : 'auto'}>
        <StatusBar style="dark" />
        <View style={styles.brandSpace} />
        <WelcomeContent />
        <View style={styles.hero} accessible={false} accessibilityElementsHidden>
          <View style={styles.artworkClip}>
            <WelcomeCharacters />
            <IllustrationEdgeBlur />
          </View>
          <LottieView
            source={welcomeAnimation}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.animation}
          />
        </View>
        <View style={styles.actions}>
          <WelcomePrimaryButton onPress={() => setAuthMode(account ? 'profile' : registration ? 'verify' : 'signup')} />
          <WelcomeLogin onLoginPress={() => setAuthMode('login')} />
        </View>
      </SafeAreaView>
      <AuthModal visible={authMode !== null} scrollEnabled
        progress={authMode === 'verify' ? 33 : authMode === 'profile' ? 67 : authMode === 'notifications' ? 100 : undefined}
        title={authMode ? titles[authMode] : ''}
        onClose={() => setAuthMode(null)}
        onBack={goBack}>
        {authMode === 'login' && <LoginForm initialEmail={loginEmail} onSignUp={() => setAuthMode('signup')} onForgotPassword={() => setAuthMode('forgot')} />}
        {authMode === 'signup' && <SignUpForm initialEmail={registration?.email} onLogin={() => setAuthMode('login')} onContinue={challenge => { setRegistration(challenge); setAuthMode('verify'); }} />}
        {authMode === 'verify' && registration && <VerifyEmailForm key={registration.challengeId} challenge={registration} onVerified={() => { setLoginEmail(registration.email); setRegistration(null); setAuthMode('login'); }} />}
        {authMode === 'forgot' && <ForgotPasswordForm initialEmail={resetChallenge.email} resendAt={resetChallenge.resendAt} onRequested={(email, resendAt) => setResetChallenge({ email, resendAt })} onLogin={() => setAuthMode('login')} onReset={() => setAuthMode('reset')} />}
        {authMode === 'reset' && <ResetPasswordForm email={resetChallenge.email} resendAt={resetChallenge.resendAt} onRequested={(email, resendAt) => setResetChallenge({ email, resendAt })} onLogin={() => { setLoginEmail(resetChallenge.email); setResetChallenge({ email: '', resendAt: 0 }); setAuthMode('login'); }} />}
        {authMode === 'profile' && <ProfileForm onExplore={() => setAuthMode('notifications')} />}
        {authMode === 'notifications' && <NotificationPermissionForm onContinue={finishAccountSetup} />}
      </AuthModal>
      <View pointerEvents="none" style={[styles.brandOverlay, { top: insets.top }]}>
        <WelcomeBrand />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandSpace: { height: 79.26 },
  brandOverlay: { position: 'absolute', left: 0, right: 0, zIndex: 20 },
  hero: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  artworkClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  actions: {
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  animation: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    // Match the Lottie canvas so contain mode fills the width.
    aspectRatio: 480 / 720,
    // X: positive moves right; negative moves left.
    // Y: positive moves down; negative moves up, beyond the hero if needed.
    transform: [{ translateX: 0 }, { translateY: 50 }],
  },
});
