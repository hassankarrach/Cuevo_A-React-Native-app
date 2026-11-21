import { AccessibilityInfo } from 'react-native';
import Toast from 'react-native-toast-message';

export type AppToastType = 'success' | 'error' | 'info';
export function showToast(type: AppToastType, title: string, message?: string) {
  Toast.show({ type, text1: title, text2: message, visibilityTime: type === 'error' ? 4500 : 3000 });
  AccessibilityInfo.announceForAccessibility([title, message].filter(Boolean).join('. '));
}
