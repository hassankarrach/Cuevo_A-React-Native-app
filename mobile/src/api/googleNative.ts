import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Public OAuth identifiers approved in the backend's auth lifecycle contract.
const iosClientId = '699911618982-o9n9v5s8t8ebcsuqi3s24du0hjgea6t8.apps.googleusercontent.com';
const webClientId = '699911618982-tbvbceq7c04nsgnh656ifabrdt3ep7iq.apps.googleusercontent.com';
let busy = false;
let configured = false;
export async function googleIdToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') throw new Error('Google sign-in is currently available on iPhone and iPad.');
  if (Constants.appOwnership === 'expo') throw new Error('Google sign-in needs the installed Cuevo app. It is unavailable in Expo Go.');
  if (busy) return null;
  busy = true;
  try {
    // Load only on supported native builds so Expo Go and browser preview stay usable.
    const { GoogleSignin, isSuccessResponse, isCancelledResponse, isErrorWithCode, statusCodes } = await import('@react-native-google-signin/google-signin');
    if (!configured) { GoogleSignin.configure({ iosClientId, webClientId, offlineAccess: false }); configured = true; }
    try {
      // Obtain a fresh choice/token instead of silently reusing another account.
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return null;
      if (!isSuccessResponse(response) || !response.data.idToken) throw new Error('Google did not return a sign-in token. Try again.');
      return response.data.idToken;
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
      throw new Error('Couldn’t sign in with Google. Please try again.');
    } finally {
      await GoogleSignin.signOut().catch(() => undefined);
    }
  } finally { busy = false; }
}
