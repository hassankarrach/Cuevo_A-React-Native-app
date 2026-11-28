/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(name, dependencies = {}) {
  const mod = new Module(name);
  mod.require = id => dependencies[id] ?? require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, `../src/api/${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, `${name}.cjs`);
  return mod.exports;
}
const client = load('client');
const { SessionManager } = load('session', { './client': client });
const account = { id: 'account-a', email: 'a@example.com', emailVerified: true,
  profileCompleted: true, onboardingStep: 'HOME', createdAt: new Date().toISOString() };
function tokens(expired = false, suffix = 'a') {
  return { accessToken: 'access-'.padEnd(40, suffix), refreshToken: 'refresh-'.padEnd(40, suffix),
    tokenType: 'Bearer', expiresAt: new Date(Date.now() + (expired ? -1000 : 900000)).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(), account };
}
function storage(session) {
  return { value: session ? JSON.stringify({ apiUrl: 'local', session }) : null,
    async read() { return this.value; }, async write(value) { this.value = value; }, async remove() { this.value = null; } };
}

test('login persists tokens without passwords; a new manager restores and checks /me', async () => {
  const disk = storage();
  const request = async (url, options) => {
    if (url.endsWith('/login')) { assert.equal(options.body.email, 'a@example.com'); return tokens(); }
    assert.equal(url, '/api/v1/me'); assert.ok(options.accessToken); return account;
  };
  const first = new SessionManager(disk, 'local', request);
  await first.initialize();
  await first.login(' A@example.com ', 'password-for-test');
  assert.equal(disk.value.includes('password-for-test'), false);
  const reopened = new SessionManager(disk, 'local', request);
  await reopened.initialize();
  assert.equal(reopened.getSnapshot().account.id, account.id);
});
test('concurrent authenticated requests rotate an expired token only once', async () => {
  const disk = storage(tokens());
  let refreshes = 0;
  const request = async url => {
    if (url.endsWith('/refresh')) { refreshes++; assert.equal(disk.value, null); return tokens(false, 'b'); }
    return account;
  };
  const manager = new SessionManager(disk, 'local', request);
  await manager.initialize();
  const realNow = Date.now;
  const now = realNow();
  Date.now = () => now + 901000;
  try { await Promise.all([manager.authenticatedRequest('/one'), manager.authenticatedRequest('/two')]); }
  finally { Date.now = realNow; }
  assert.equal(refreshes, 1);
});
test('ambiguous refresh failure discards the old token and never retries it', async () => {
  const disk = storage(tokens(true));
  let calls = 0;
  const manager = new SessionManager(disk, 'local', async () => { calls++; throw new client.ApiError('Timeout', 'REQUEST_TIMEOUT', 0); });
  await manager.initialize();
  await manager.checkSession();
  assert.equal(calls, 1); assert.equal(disk.value, null); assert.equal(manager.getSnapshot().account, null);
});
test('temporary /me outage keeps credentials and offers restoration retry', async () => {
  const disk = storage(tokens());
  let offline = true;
  const manager = new SessionManager(disk, 'local', async () => { if (offline) throw new Error('offline'); return account; });
  await manager.initialize();
  assert.ok(manager.getSnapshot().error); assert.ok(disk.value);
  offline = false; await manager.initialize();
  assert.equal(manager.getSnapshot().account.id, account.id);
});
test('server revocation and a changed API environment clear credentials', async () => {
  const disk = storage(tokens());
  const manager = new SessionManager(disk, 'local', async () => { throw new client.ApiError('Revoked', 'SESSION_REVOKED', 401); });
  await manager.initialize(); assert.equal(disk.value, null);
  const other = storage(tokens());
  await new SessionManager(other, 'another-server', async () => { assert.fail('Must not send credentials to another server'); }).initialize();
  assert.equal(other.value, null);
});
test('logout removes local credentials before revocation, even when offline', async () => {
  const disk = storage(tokens());
  const manager = new SessionManager(disk, 'local', async url => {
    if (url.endsWith('/logout')) { assert.equal(disk.value, null); throw new Error('offline'); }
    return account;
  });
  await manager.initialize();
  await assert.rejects(manager.logout());
  assert.equal(manager.getSnapshot().account, null); assert.equal(disk.value, null);
});
test('invalid successful login responses and storage failures never authenticate', async () => {
  const disk = storage();
  const manager = new SessionManager(disk, 'local', async () => ({ accessToken: 'incomplete' }));
  await manager.initialize(); await assert.rejects(manager.login(account.email, 'password-for-test'));
  assert.equal(manager.getSnapshot().account, null);
  disk.write = async () => { throw new Error('Keychain unavailable'); };
  const second = new SessionManager(disk, 'local', async () => tokens());
  await second.initialize(); await assert.rejects(second.login(account.email, 'password-for-test'));
  assert.equal(second.getSnapshot().account, null);
});

test('profile completion persists updated account for session restoration', async () => {
  const disk = storage();
  const incomplete = { ...account, profileCompleted: false, onboardingStep: 'SET_UP_PROFILE' };
  const manager = new SessionManager(disk, 'local', async url => {
    if (url.endsWith('/login')) return { ...tokens(), account: incomplete };
    assert.equal(url, '/api/v1/me/onboarding/profile-completed');
    return account;
  });
  await manager.login('a@example.com', 'password');
  await manager.completeProfile();
  assert.equal(manager.getSnapshot().account.profileCompleted, true);
  assert.equal(JSON.parse(disk.value).session.account.onboardingStep, 'HOME');
});

const profileApi = load('profile', { './client': client });
test('setup saves identity before uploading raw photo bytes', async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return { displayName: 'Alex', username: 'alex_demo', avatarUrl: null };
  };
  const result = await profileApi.saveSetup(request, ' Alex ', ' ALEX_DEMO ', btoa('image'), false);
  assert.deepEqual(calls[0].options.body, { displayName: 'Alex', username: 'alex_demo' });
  assert.equal(calls[1].url, '/api/v1/me/avatar');
  assert.equal(calls[1].options.contentType, 'image/jpeg');
  assert.equal(new TextDecoder().decode(calls[1].options.rawBody), 'image');
  assert.equal(result.avatarUri, `data:image/jpeg;base64,${btoa('image')}`);
});
test('setup stops when profile save fails and propagates photo upload failures', async () => {
  let calls = 0;
  await assert.rejects(profileApi.saveSetup(async () => { calls++; throw new Error('Username unavailable'); }, 'Alex', 'alex', btoa('image'), false), /Username unavailable/);
  assert.equal(calls, 1);
  await assert.rejects(profileApi.saveSetup(async url => {
    if (url.endsWith('/avatar')) throw new Error('Upload failed');
    return { displayName: 'Alex', username: 'alex', avatarUrl: null };
  }, 'Alex', 'alex', btoa('image'), false), /Upload failed/);
});
test('profile loading fetches protected avatar and missing profiles return null', async () => {
  const profile = await profileApi.readProfile(async (url, options) => {
    if (url.endsWith('/avatar')) { assert.equal(options.responseType, 'image'); return 'data:image/jpeg;base64,aW1hZ2U='; }
    return { displayName: 'Alex', username: 'alex', avatarUrl: '/api/v1/profiles/account-a/avatar' };
  });
  assert.equal(profile.avatarUri, 'data:image/jpeg;base64,aW1hZ2U=');
  assert.equal(await profileApi.readProfile(async () => { throw new client.ApiError('Missing', 'NOT_FOUND', 404); }), null);
});
test('API transport sends raw avatar bytes and reads authenticated image responses', async () => {
  const previousFetch = global.fetch;
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
  const rawBody = Uint8Array.from([1, 2, 3]).buffer;
  try {
    global.fetch = async (_url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      if (options.method === 'PUT') {
        assert.equal(options.headers['Content-Type'], 'image/jpeg');
        assert.equal(options.body, rawBody);
        return new Response(JSON.stringify({ avatarUrl: '/api/v1/profiles/a/avatar' }));
      }
      return new Response(rawBody, { headers: { 'Content-Type': 'image/jpeg' } });
    };
    await client.apiRequest('/api/v1/me/avatar', { method: 'PUT', rawBody, contentType: 'image/jpeg', accessToken: 'test-token' });
    assert.equal(await client.apiRequest('/api/v1/profiles/a/avatar', { responseType: 'image', accessToken: 'test-token' }), 'data:image/jpeg;base64,AQID');
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previousUrl;
  }
});

test('Google login stores Cuevo credentials without Google token and resumes setup', async () => {
  const disk = storage();
  const manager = new SessionManager(disk, 'local', async (url, options) => {
    assert.equal(url, '/api/v1/auth/google');
    assert.deepEqual(options.body, { idToken: 'google-id-token' });
    return { ...tokens(), account: { ...account, profileCompleted: false, onboardingStep: 'SET_UP_PROFILE' } };
  });
  await manager.googleLogin('google-id-token');
  assert.equal(manager.getSnapshot().account.onboardingStep, 'SET_UP_PROFILE');
  assert.equal(disk.value.includes('google-id-token'), false);
});
test('Google collision requires explicit linking and leaves user signed out', async () => {
  const disk = storage();
  const manager = new SessionManager(disk, 'local', async () => { throw new client.ApiError('Link required', 'ACCOUNT_LINK_REQUIRED', 409); });
  await assert.rejects(manager.googleLogin('google-token'), error => error.code === 'ACCOUNT_LINK_REQUIRED');
  assert.equal(disk.value, null);
  assert.equal(manager.getSnapshot().account, null);
});
test('Google linking and unlinking persist rotated credentials without passwords', async () => {
  const disk = storage();
  const manager = new SessionManager(disk, 'local', async (url, options) => {
    if (url.endsWith('/login')) return tokens();
    assert.equal(disk.value, null);
    assert.equal(options.body.currentPassword, 'current-password');
    if (url.endsWith('/unlink')) return tokens(false, 'c');
    assert.equal(options.body.idToken, 'google-token');
    return tokens(false, 'b');
  });
  await manager.login('a@example.com', 'password');
  await manager.linkGoogle('google-token', 'current-password');
  assert.equal(JSON.parse(disk.value).session.refreshToken, tokens(false, 'b').refreshToken);
  await manager.unlinkGoogle('current-password');
  assert.equal(JSON.parse(disk.value).session.refreshToken, tokens(false, 'c').refreshToken);
  assert.equal(disk.value.includes('current-password'), false);
  assert.equal(disk.value.includes('google-token'), false);
});
test('ambiguous Google rotation discards old credentials; definite rejection retains them', async () => {
  const disk = storage(); let ambiguous = false;
  const manager = new SessionManager(disk, 'local', async url => {
    if (url.endsWith('/login')) return tokens();
    throw ambiguous ? new client.ApiError('Offline', 'NETWORK_ERROR', 0) : new client.ApiError('Already linked', 'GOOGLE_ALREADY_LINKED', 409);
  });
  await manager.login('a@example.com', 'password');
  await assert.rejects(manager.linkGoogle('token', 'password')); assert.ok(disk.value);
  ambiguous = true;
  await assert.rejects(manager.linkGoogle('token', 'password'));
  assert.equal(disk.value, null); assert.equal(manager.getSnapshot().account, null);
});

test('native Google adapter configures the approved audience and handles cancellation', async () => {
  let cancelled = false; let signOuts = 0; let configured;
  const native = {
    GoogleSignin: { configure: value => { configured = value; }, signOut: async () => { signOuts++; },
      signIn: async () => cancelled ? { type: 'cancelled' } : { type: 'success', data: { idToken: 'native-google-token' } } },
    isSuccessResponse: response => response.type === 'success', isCancelledResponse: response => response.type === 'cancelled',
    isErrorWithCode: () => false, statusCodes: {},
  };
  const adapter = load('googleNative', { 'expo-constants': { appOwnership: 'standalone' },
    'react-native': { Platform: { OS: 'ios' } }, '@react-native-google-signin/google-signin': native });
  assert.equal(await adapter.googleIdToken(), 'native-google-token');
  assert.equal(configured.offlineAccess, false);
  assert.equal(configured.webClientId, '699911618982-tbvbceq7c04nsgnh656ifabrdt3ep7iq.apps.googleusercontent.com');
  cancelled = true;
  assert.equal(await adapter.googleIdToken(), null);
  assert.equal(signOuts, 4);
});
test('Expo Go is guarded before attempting to load the Google native module', async () => {
  const adapter = load('googleNative', { 'expo-constants': { appOwnership: 'expo' },
    'react-native': { Platform: { OS: 'ios' } } });
  await assert.rejects(adapter.googleIdToken(), /unavailable in Expo Go/);
});

test('password recovery normalizes email and sends the entered code/password only to confirmation', async () => {
  const calls = [];
  const recovery = load('passwordRecovery', { './client': { ...client, apiRequest: async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('/request') ? { accepted: true } : { changed: true };
  } } });
  await recovery.requestPasswordReset(' A@Example.com ');
  await recovery.confirmPasswordReset(' A@Example.com ', '654321', 'new-test-password');
  assert.deepEqual(calls[0], { url: '/api/v1/auth/password/reset/request', options: { method: 'POST', body: { email: 'a@example.com' } } });
  assert.deepEqual(calls[1], { url: '/api/v1/auth/password/reset/confirm', options: { method: 'POST', body: { email: 'a@example.com', code: '654321', password: 'new-test-password' } } });
});
test('password recovery rejects unexpected success responses and preserves server failures', async () => {
  const invalid = load('passwordRecovery', { './client': { ...client, apiRequest: async () => ({}) } });
  await assert.rejects(invalid.requestPasswordReset('a@example.com'), error => error.code === 'INVALID_RESPONSE');
  await assert.rejects(invalid.confirmPasswordReset('a@example.com', '123456', 'password'), error => error.code === 'INVALID_RESPONSE');
  const failure = new client.ApiError('Code expired', 'CODE_EXPIRED', 400);
  const failed = load('passwordRecovery', { './client': { ...client, apiRequest: async () => { throw failure; } } });
  await assert.rejects(failed.confirmPasswordReset('a@example.com', '123456', 'password'), error => error === failure);
  const limited = new client.ApiError('Slow down', 'RATE_LIMITED', 429, undefined, 90);
  const throttled = load('passwordRecovery', { './client': { ...client, apiRequest: async () => { throw limited; } } });
  await assert.rejects(throttled.requestPasswordReset('a@example.com'), error => error.retryAfterSeconds === 90);
});

test('password change rotates and saves credentials before the next authenticated request', async () => {
  const disk = storage();
  const manager = new SessionManager(disk, 'local', async (url, options) => {
    if (url.endsWith('/login')) return tokens();
    if (url === '/api/v1/me/password') {
      assert.equal(options.method, 'PUT');
      assert.deepEqual(options.body, { currentPassword: 'old-password', newPassword: 'new-password' });
      assert.equal(disk.value, null);
      assert.equal(options.accessToken, tokens().accessToken);
      return tokens(false, 'b');
    }
    assert.equal(options.accessToken, tokens(false, 'b').accessToken);
    return account;
  });
  await manager.login('a@example.com', 'old-password');
  await Promise.all([manager.changePassword('old-password', 'new-password'), manager.authenticatedRequest('/api/v1/me')]);
  assert.equal(JSON.parse(disk.value).session.refreshToken, tokens(false, 'b').refreshToken);
  assert.equal(disk.value.includes('old-password'), false);
  assert.equal(disk.value.includes('new-password'), false);
});
test('wrong current password and rate limits preserve the existing session', async () => {
  const disk = storage(); let limited = false;
  const manager = new SessionManager(disk, 'local', async url => {
    if (url.endsWith('/login')) return tokens();
    throw limited ? new client.ApiError('Wait', 'RATE_LIMITED', 429, undefined, 60) : new client.ApiError('Wrong password', 'INVALID_CREDENTIALS', 401);
  });
  await manager.login('a@example.com', 'password');
  await assert.rejects(manager.changePassword('wrong-password', 'new-password'), error => error.code === 'INVALID_CREDENTIALS');
  assert.equal(manager.getSnapshot().account.id, account.id); assert.ok(disk.value);
  limited = true;
  await assert.rejects(manager.changePassword('password', 'new-password'), error => error.retryAfterSeconds === 60);
  assert.ok(disk.value);
});
test('lost password-change response discards stale credentials without retry', async () => {
  const disk = storage(); let changes = 0;
  const manager = new SessionManager(disk, 'local', async url => {
    if (url.endsWith('/login')) return tokens();
    changes++; throw new client.ApiError('Offline', 'NETWORK_ERROR', 0);
  });
  await manager.login('a@example.com', 'password');
  await assert.rejects(manager.changePassword('password', 'new-password'));
  assert.equal(changes, 1); assert.equal(disk.value, null); assert.equal(manager.getSnapshot().account, null);
});
