// Local UI challenge only. Replace with server-issued email challenges before release.
export const localEmailCode = '123456';
export const challengeLifetimeMs = 15 * 60 * 1000;
export function emailError(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'Enter a valid email address.';
}
export function passwordError(password: string) {
  return password.length >= 8 ? '' : 'Use at least 8 characters.';
}
export function codeError(code: string, expiresAt: number) {
  if (!/^\d{6}$/.test(code)) return 'Enter the 6-digit code.';
  if (Date.now() >= expiresAt) return 'This code has expired. Request a new one.';
  return code === localEmailCode ? '' : 'That code isn’t correct. Please try again.';
}
