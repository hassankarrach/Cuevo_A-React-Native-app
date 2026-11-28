export function emailError(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'Enter a valid email address.';
}
export function passwordError(password: string) {
  return password.length >= 8 ? '' : 'Use at least 8 characters.';
}
