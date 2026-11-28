import { apiRequest, ApiError } from './client';

export async function requestPasswordReset(email: string): Promise<void> {
  const data = await apiRequest('/api/v1/auth/password/reset/request', {
    method: 'POST', body: { email: email.trim().toLowerCase() },
  });
  if (!data || typeof data !== 'object' || !('accepted' in data) || data.accepted !== true) {
    throw new ApiError('Unexpected password recovery response. Please try again.', 'INVALID_RESPONSE', 202);
  }
}
export async function confirmPasswordReset(email: string, code: string, password: string): Promise<void> {
  const data = await apiRequest('/api/v1/auth/password/reset/confirm', {
    method: 'POST', body: { email: email.trim().toLowerCase(), code, password },
  });
  if (!data || typeof data !== 'object' || !('changed' in data) || data.changed !== true) {
    throw new ApiError('Unable to confirm your password was changed. Try logging in or request a new code.', 'INVALID_RESPONSE', 200);
  }
}
