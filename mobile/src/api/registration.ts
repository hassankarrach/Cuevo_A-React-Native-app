import { apiRequest, ApiError } from './client';

export type RegistrationChallenge = {
  challengeId: string;
  email: string;
  maskedEmail: string;
  expiresAt: string;
  resendAvailableAt: string;
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function registerAccount(email: string, password: string): Promise<RegistrationChallenge> {
  const data = await apiRequest('/api/v1/auth/register', {
    method: 'POST', body: { email: email.trim().toLowerCase(), password },
  });
  if (!object(data) || typeof data.challengeId !== 'string' || !data.challengeId
    || typeof data.maskedEmail !== 'string' || typeof data.expiresAt !== 'string'
    || !Number.isFinite(Date.parse(data.expiresAt)) || typeof data.resendAvailableAt !== 'string'
    || !Number.isFinite(Date.parse(data.resendAvailableAt)) || !object(data.account)
    || typeof data.account.email !== 'string' || data.account.emailVerified !== false) {
    throw new ApiError('The service returned an unexpected registration response.', 'INVALID_RESPONSE', 200);
  }
  return {
    challengeId: data.challengeId, email: data.account.email, maskedEmail: data.maskedEmail,
    expiresAt: data.expiresAt, resendAvailableAt: data.resendAvailableAt,
  };
}

export async function resendRegistration(challenge: RegistrationChallenge): Promise<RegistrationChallenge> {
  const data = await apiRequest('/api/v1/auth/email/resend', {
    method: 'POST', body: { email: challenge.email },
  });
  if (!object(data) || data.accepted !== true || typeof data.challengeId !== 'string' || !data.challengeId
    || typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))
    || typeof data.resendAvailableAt !== 'string' || !Number.isFinite(Date.parse(data.resendAvailableAt))) {
    throw new ApiError('The service returned an unexpected resend response.', 'INVALID_RESPONSE', 202);
  }
  return { ...challenge, challengeId: data.challengeId, expiresAt: data.expiresAt, resendAvailableAt: data.resendAvailableAt };
}

export async function verifyRegistration(challenge: RegistrationChallenge, code: string): Promise<void> {
  const data = await apiRequest('/api/v1/auth/email/verify', {
    method: 'POST', body: { email: challenge.email, challengeId: challenge.challengeId, code },
  });
  if (!object(data) || data.emailVerified !== true || data.email !== challenge.email) {
    throw new ApiError('The service returned an unexpected verification response.', 'INVALID_RESPONSE', 200);
  }
}

export function registrationError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Unable to complete the request. Please try again.';
  if (error.code === 'EMAIL_ALREADY_USED') return 'This email already has an account. Log in or reset your password.';
  if (error.code === 'ACCOUNT_LINK_REQUIRED') return 'This email already has a Cuevo account. Log in with your password, then connect Google in Settings → Linked accounts.';
  if (error.code === 'LAST_LOGIN_METHOD') return 'Set a password using password recovery before disconnecting Google.';
  if (error.code === 'GOOGLE_IDENTITY_IN_USE') return 'This Google account is connected to another Cuevo account.';
  if (error.code === 'GOOGLE_AUTH_NOT_CONFIGURED') return 'Google sign-in is temporarily unavailable. Please try again later.';
  if (error.code === 'RATE_LIMITED' && error.retryAfterSeconds) {
    const seconds = error.retryAfterSeconds;
    return seconds < 60 ? `Too many attempts. Try again in ${seconds} seconds.`
      : `Too many attempts. Try again in about ${Math.ceil(seconds / 60)} minutes.`;
  }
  return error.fieldErrors.map(field => field.message).join('\n') || error.message;
}
