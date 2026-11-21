import { Platform } from 'react-native';

// Use named static faces so the same weight renders on iOS, Android, and web.
export const fonts = {
  input: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  regular: 'Lufga-Regular',
  medium: 'Lufga-Medium',
  semibold: 'Lufga-SemiBold',
  bold: 'Lufga-Bold',
  black: 'Lufga-Black',
  brand: 'ClashGrotesk-Semibold',
  handwriting: 'Caveat-Regular',
} as const;

export const fontAssets = {
  [fonts.black]: require('../../assets/fonts/lufga/Lufga-Black.otf'),
  [fonts.handwriting]: require('../../assets/fonts/caveat/Caveat-Regular.ttf'),
  [fonts.regular]: require('../../assets/fonts/lufga/Lufga-Regular.otf'),
  [fonts.medium]: require('../../assets/fonts/lufga/Lufga-Medium.otf'),
  [fonts.semibold]: require('../../assets/fonts/lufga/Lufga-SemiBold.otf'),
  [fonts.bold]: require('../../assets/fonts/lufga/Lufga-Bold.otf'),
  [fonts.brand]: require('../../assets/fonts/clash-grotesk/ClashGrotesk-Semibold.otf'),
};
