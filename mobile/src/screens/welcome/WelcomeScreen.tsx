import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import welcomeAnimation from '../../../assets/animations/cuevo-welcome.json';
import AuthModal from '../auth/AuthModal';
import ForgotPasswordForm from '../auth/ForgotPasswordForm';
import ResetPasswordForm from '../auth/ResetPasswordForm';
import VerifyEmailForm from '../auth/VerifyEmailForm';
import SignUpForm from '../auth/SignUpForm';
import ProfileForm from '../auth/ProfileForm';
import LoginForm from '../login/components/LoginForm';
import IllustrationEdgeBlur from './components/IllustrationEdgeBlur';
import WelcomeBackground from './components/WelcomeBackground';
import WelcomeContent from './components/WelcomeContent';
import WelcomeBrand from './components/WelcomeBrand';
import WelcomeCharacters from './components/WelcomeCharacters';

export default function WelcomeScreen() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'verify' | 'profile' | 'forgot' | 'reset' | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [resetChallenge, setResetChallenge] = useState({ email: '', expiresAt: 0 });
  const titles = { login: 'Log in', signup: 'Create an account', verify: 'Verify your email', profile: 'Your profile', forgot: 'Forgot password', reset: 'Reset password' };
  function goBack() {
    if (authMode === 'forgot') setAuthMode('login');
    else if (authMode === 'reset') setAuthMode('forgot');
    else if (authMode === 'verify' || authMode === 'profile') setAuthMode('signup');
    else setAuthMode(null);
  }

  return (
    <View style={styles.container}>
      <WelcomeBackground />
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <WelcomeBrand />
        <View style={styles.hero} accessible={false} accessibilityElementsHidden>
          <LottieView
            source={welcomeAnimation}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.animation}
          />
          <IllustrationEdgeBlur />
          <WelcomeCharacters />
        </View>
        <WelcomeContent onLoginPress={() => setAuthMode('login')} onGetStarted={() => setAuthMode('signup')} />
      </SafeAreaView>
      <AuthModal visible={authMode !== null}
        progress={authMode === 'signup' ? 0 : authMode === 'verify' ? 33 : authMode === 'profile' ? 67 : undefined}
        title={authMode ? titles[authMode] : ''}
        onClose={() => setAuthMode(null)}
        onBack={goBack}>
        {authMode === 'login' && <LoginForm onSignUp={() => setAuthMode('signup')} onForgotPassword={() => setAuthMode('forgot')} />}
        {(authMode === 'signup' || authMode === 'verify' || authMode === 'profile') && <View style={authMode !== 'signup' ? { display: 'none' } : undefined}><SignUpForm initialEmail={signupEmail} onLogin={() => setAuthMode('login')} onContinue={email => { setSignupEmail(email); setAuthMode('verify'); }} /></View>}
        {authMode === 'verify' && <VerifyEmailForm key={signupEmail} email={signupEmail} onVerified={() => setAuthMode('profile')} onChangeEmail={() => setAuthMode('signup')} />}
        {authMode === 'forgot' && <ForgotPasswordForm onLogin={() => setAuthMode('login')} onReset={(email, expiresAt) => { setResetChallenge({ email, expiresAt }); setAuthMode('reset'); }} />}
        {authMode === 'reset' && <ResetPasswordForm email={resetChallenge.email} expiresAt={resetChallenge.expiresAt} onLogin={() => setAuthMode('login')} onChangeEmail={() => setAuthMode('forgot')} />}
        {authMode === 'profile' && <ProfileForm onExplore={() => { setAuthMode(null); router.push('/introduction'); }} />}
      </AuthModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    flex: 3,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  animation: {
    width: '100%',
    aspectRatio: 480 / 720,
    flexShrink: 0,
    transform: [{ translateY: -24 }],
  },
});
