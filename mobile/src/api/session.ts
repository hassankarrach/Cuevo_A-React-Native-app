import { apiRequest, ApiError, type RequestOptions } from './client';

export type Account = {
  id: string; email: string; emailVerified: boolean; profileCompleted: boolean;
  onboardingStep: 'VERIFY_EMAIL' | 'SET_UP_PROFILE' | 'HOME'; createdAt: string;
};
export type Session = {
  accessToken: string; refreshToken: string; tokenType: 'Bearer';
  expiresAt: string; refreshExpiresAt: string; account: Account;
};
type Storage = { read: () => Promise<string | null>; write: (value: string) => Promise<void>; remove: () => Promise<void> };
type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
export type AuthSnapshot = { account: Account | null; loading: boolean; error: string | null };
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function parseAccount(value: unknown): Account {
  if (!object(value) || typeof value.id !== 'string' || typeof value.email !== 'string'
    || typeof value.emailVerified !== 'boolean' || typeof value.profileCompleted !== 'boolean'
    || !['VERIFY_EMAIL', 'SET_UP_PROFILE', 'HOME'].includes(String(value.onboardingStep)) || !date(value.createdAt)) {
    throw new ApiError('The service returned an unexpected account response.', 'INVALID_RESPONSE', 200);
  }
  return value as Account;
}
export function parseSession(value: unknown): Session {
  if (!object(value) || typeof value.accessToken !== 'string' || value.accessToken.length < 32
    || typeof value.refreshToken !== 'string' || value.refreshToken.length < 32
    || value.tokenType !== 'Bearer' || !date(value.expiresAt) || !date(value.refreshExpiresAt)) {
    throw new ApiError('The service returned an unexpected login response.', 'INVALID_RESPONSE', 200);
  }
  return { ...value, account: parseAccount(value.account) } as Session;
}

// All session operations share a queue. Concurrent callers cannot submit the
// same single-use refresh token, or overwrite credentials after logout.
export class SessionManager {
  private session: Session | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private snapshot: AuthSnapshot = { account: null, loading: true, error: null };
  constructor(private storage: Storage, private apiUrl: string, private request: Request = apiRequest) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(loading = false, error: string | null = null) {
    this.snapshot = { account: this.session?.account ?? null, loading, error };
    this.listeners.forEach(listener => listener());
  }
  private run<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async clear() {
    await this.storage.remove();
    this.session = null;
    this.publish();
  }
  private async save(session: Session) {
    await this.storage.write(JSON.stringify({ apiUrl: this.apiUrl, session }));
    this.session = session;
    this.publish();
  }
  initialize = () => this.run(async () => {
    this.publish(true);
    try {
      const saved = await this.storage.read();
      if (!saved) { this.session = null; this.publish(); return; }
      let record;
      try {
        record = JSON.parse(saved);
        if (!object(record) || record.apiUrl !== this.apiUrl) { await this.clear(); return; }
        this.session = parseSession(record.session);
      } catch { await this.clear(); return; }
      const session = await this.ensureSession();
      const account = parseAccount(await this.request('/api/v1/me', { accessToken: session.accessToken }));
      await this.save({ ...session, account });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { await this.clear(); return; }
      // A temporary outage while checking an unexpired session is retryable.
      // An ambiguous refresh already cleared its credentials in ensureSession.
      if (!this.session) { this.publish(); return; }
      this.snapshot = { account: null, loading: false, error: 'Unable to restore your session. Check your connection and try again.' };
      this.listeners.forEach(listener => listener());
    }
  });
  login = (email: string, password: string) => this.run(async () => {
    const session = parseSession(await this.request('/api/v1/auth/login', {
      method: 'POST', body: { email: email.trim().toLowerCase(), password },
    }));
    if (!session.account.emailVerified) throw new ApiError('Verify your email before signing in.', 'EMAIL_NOT_VERIFIED', 403);
    try { await this.save(session); }
    catch {
      await this.request('/api/v1/auth/logout', { method: 'POST', accessToken: session.accessToken }).catch(() => undefined);
      throw new Error('Unable to securely save your session. Please try signing in again.');
    }
  });
  googleLogin = (idToken: string) => this.run(async () => {
    const session = parseSession(await this.request('/api/v1/auth/google', { method: 'POST', body: { idToken } }));
    if (!session.account.emailVerified) throw new Error('Google could not verify your email.');
    try { await this.save(session); }
    catch {
      await this.request('/api/v1/auth/logout', { method: 'POST', accessToken: session.accessToken }).catch(() => undefined);
      throw new Error('Unable to securely save your session. Please sign in again.');
    }
  });
  private rotateCredentials = (path: string, body: Record<string, string>, method: 'POST' | 'PUT' = 'POST') => this.run(async () => {
    const previous = await this.ensureSession();
    // Password and linked-account changes rotate credentials. Never replay stale tokens after a lost response.
    await this.storage.remove();
    this.session = null;
    let next: Session;
    try {
      next = parseSession(await this.request(path, { method, body, accessToken: previous.accessToken }));
      if (next.account.id !== previous.account.id) throw new Error('Session account changed unexpectedly.');
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500
        && (error.status !== 401 || ['INVALID_CREDENTIALS', 'INVALID_GOOGLE_TOKEN'].includes(error.code))) await this.save(previous);
      else this.publish();
      throw error;
    }
    try { await this.save(next); }
    catch {
      this.publish();
      await this.request('/api/v1/auth/logout', { method: 'POST', accessToken: next.accessToken }).catch(() => undefined);
      throw new Error('Unable to securely save your session. Please sign in again.');
    }
  });
  linkGoogle = (idToken: string, currentPassword: string) => this.rotateCredentials('/api/v1/me/linked-accounts/google', { idToken, currentPassword });
  unlinkGoogle = (currentPassword: string) => this.rotateCredentials('/api/v1/me/linked-accounts/google/unlink', { currentPassword });
  changePassword = (currentPassword: string, newPassword: string) => this.rotateCredentials('/api/v1/me/password', { currentPassword, newPassword }, 'PUT');
  private async ensureSession(): Promise<Session> {
    if (!this.session) throw new ApiError('Please sign in again.', 'AUTHENTICATION_REQUIRED', 401);
    if (Date.parse(this.session.refreshExpiresAt) <= Date.now()) {
      await this.clear();
      throw new ApiError('Your session has expired. Please sign in again.', 'SESSION_EXPIRED', 401);
    }
    if (Date.parse(this.session.expiresAt) > Date.now() + 30000) return this.session;
    const previous = this.session;
    // Remove the durable old token BEFORE sending it. A crash or lost response
    // must never replay a token that the backend may already have consumed.
    await this.storage.remove();
    this.session = null;
    try {
      const next = parseSession(await this.request('/api/v1/auth/refresh', {
        method: 'POST', body: { refreshToken: previous.refreshToken },
      }));
      if (next.account.id !== previous.account.id) throw new Error('Session account changed unexpectedly.');
      await this.save(next);
      return next;
    } catch (error) { this.publish(); throw error; }
  }
  checkSession = () => this.run(async () => { if (this.session) await this.ensureSession(); });
  completeProfile = () => this.run(async () => {
    const session = await this.ensureSession();
    const account = parseAccount(await this.request('/api/v1/me/onboarding/profile-completed', { method: 'POST', accessToken: session.accessToken }));
    if (account.id !== session.account.id || !account.profileCompleted) throw new Error('Unable to confirm profile setup.');
    await this.save({ ...session, account });
  });
  authenticatedRequest = (path: string, options: Omit<RequestOptions, 'accessToken'> = {}) => this.run(async () => {
    const session = await this.ensureSession();
    try { return await this.request(path, { ...options, accessToken: session.accessToken }); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) await this.clear();
      throw error;
    }
  });
  logout = () => this.run(async () => {
    const session = this.session;
    await this.clear();
    if (session) {
      await this.request('/api/v1/auth/logout', { method: 'POST', accessToken: session.accessToken });
    }
  });
}
