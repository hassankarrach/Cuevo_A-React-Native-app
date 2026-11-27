# Email/password account lifecycle

The implemented account API is under `/api/v1`. It is independent of the
mobile mock flow. The backend is authoritative for email verification and
session validity. JSON fields use camelCase and timestamps are UTC RFC 3339.

## Approved policy

| Policy | Server behavior |
|---|---|
| Email identity | Trim surrounding whitespace, lowercase the full address, validate it, and enforce a 254-character maximum and database uniqueness |
| Passwords | Argon2id; 8–128 Unicode code points and at most 512 UTF-8 bytes; preserve the exact submitted Unicode without trimming or normalization |
| Challenge | Cryptographically generated six-digit numeric code; purpose-bound; 15-minute expiry; five failed attempts; resend after 30 seconds; replacing or consuming a challenge invalidates it |
| Access token | Opaque bearer token, 15-minute lifetime, stored only as a keyed digest |
| Refresh/session | Opaque refresh token, single-use rotation, 30-day idle expiry and 90-day absolute session lifetime; reuse revokes that session family |
| Parallel refresh | Strict single-use. One request may rotate; a simultaneous/stale request is treated as reuse and revokes the family. Clients must coordinate refreshes and must not retry an old token |
| Password change | Revoke all other sessions and rotate the current session's access and refresh tokens |
| Password reset | Revoke all sessions; require a new login after reset |
| Email delivery | Local SMTP to Mailpit for development and in-memory capture in tests. No production email provider is configured |
| Duplicate registration | `409 EMAIL_ALREADY_USED` |
| Unverified login | Correct credentials for an unverified account receive `403 EMAIL_NOT_VERIFIED`; no session is issued |

`AUTH_SECRET_KEY` must be a private random value of at least 32 characters. It
keys challenge, bearer-token, and rate-limit digests. Do not log or commit it.
Changing it invalidates issued challenges and tokens.

## Google native sign-in and account linking

Google is the only supported social provider. The iOS app obtains a Google ID
token through native Google Sign-In and sends it to the API over HTTPS; the
backend verifies its signature with Google's published signing keys, issuer,
expiry and `aud` against `GOOGLE_SERVER_CLIENT_ID`. If `azp` is present, it
must match `GOOGLE_IOS_CLIENT_ID`. Verified tokens must contain a Google
subject and a verified, valid email. The token subject—not email—is the
external identity key. Client-supplied email, name, profile data or subject
is never used as proof. Facebook and browser-based Google authentication are
not supported.

The client IDs are public OAuth identifiers, not secrets:

| Setting | Value |
|---|---|
| `GOOGLE_IOS_CLIENT_ID` | `699911618982-o9n9v5s8t8ebcsuqi3s24du0hjgea6t8.apps.googleusercontent.com` |
| `GOOGLE_SERVER_CLIENT_ID` | `699911618982-tbvbceq7c04nsgnh656ifabrdt3ep7iq.apps.googleusercontent.com` |
| iOS bundle identifier | `com.cuevo.app` |
| iOS URL scheme | `com.googleusercontent.apps.699911618982-o9n9v5s8t8ebcsuqi3s24du0hjgea6t8` |

Set the two `GOOGLE_*_CLIENT_ID` variables in the backend environment. They
are optional at startup; if either is missing, Google endpoints return
`503 GOOGLE_AUTH_NOT_CONFIGURED`. No Web Client Secret is required or used.
The Web OAuth client is the native ID-token audience only; it does not imply
a browser client.

### iOS SDK setup

The current checkout has no iOS project or mobile source. When integrating in
the native app:

1. Configure the Google Sign-In iOS SDK with `GIDClientID` set to the iOS
   Client ID and `GIDServerClientID` set to the backend Web Client ID.
2. Set the app bundle identifier to `com.cuevo.app` and register the reversed
   iOS Client ID as a URL scheme.
3. Use the native Google Sign-In flow to obtain the ID token. Send only that
   token to `POST /api/v1/auth/google` over HTTPS. Do not send profile fields
   as identity evidence or store the token as a Cuevo session credential.
4. Store the returned Cuevo access/refresh tokens using the app's approved
   secure credential storage. Handle `ACCOUNT_LINK_REQUIRED` by asking the
   user to authenticate using their existing Cuevo method, then explicitly
   link Google.

Native SDK code, app plist/project edits and iOS build verification are not
included because no native app project is present in this checkout.

### Google authentication endpoints

`POST /api/v1/auth/google` accepts the ID token returned by the native SDK:

```json
{
  "idToken": "<google-id-token-from-ios>"
}
```

The example is a placeholder, not a valid token. On success the endpoint
returns the existing `AuthTokensResponse` shape. If the Google `sub` is
already linked, it signs in that Cuevo account. If it is new and its verified
email is unused, the API creates an email-verified Cuevo account with a
Google identity and no password. If that email already belongs to an account,
the API neither creates a duplicate nor links automatically; it returns
`409 ACCOUNT_LINK_REQUIRED`:

```json
{
  "error": {
    "code": "ACCOUNT_LINK_REQUIRED",
    "message": "Sign in with your existing method, then link Google.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": {
      "linkRequired": true,
      "linkEndpoint": "/api/v1/me/linked-accounts/google"
    }
  }
}
```

After authenticating with the existing Cuevo method, an account with a
password can explicitly link Google:

`POST /api/v1/me/linked-accounts/google` (Bearer access token)

```json
{
  "idToken": "<google-id-token-from-ios>",
  "currentPassword": "<current-cuevo-password>"
}
```

Linking requires password reauthentication and a separately verified Google
token. A Google identity owned by another Cuevo account returns
`409 GOOGLE_IDENTITY_IN_USE`; an already-linked identity returns
`409 GOOGLE_ALREADY_LINKED`. No merge occurs. Successful linking returns a
rotated token pair in the existing auth response shape, revokes all other
active sessions, and invalidates the previous access/refresh credentials for
the current session.

`GET /api/v1/me/linked-accounts` (Bearer access token) returns:

```json
{
  "passwordEnabled": true,
  "googleLinked": true
}
```

`POST /api/v1/me/linked-accounts/google/unlink` (Bearer access token) accepts
exactly one reauthentication method:

```json
{
  "currentPassword": "<current-cuevo-password>"
}
```

or, when reauthenticating with the linked Google method:

```json
{
  "idToken": "<fresh-google-id-token-from-ios>"
}
```

Unlinking requires a remaining usable login method. A Google-only account
receives `409 LAST_LOGIN_METHOD`; it must first establish another login
method (for example, set a password through account recovery). ID-token
reauthentication for unlinking requires a verified token issued within the
previous five minutes. Successful unlinking deletes only the identity association, not the
Cuevo account. It revokes other sessions and rotates the current session's
access and refresh tokens. Invalid tokens return `401 INVALID_GOOGLE_TOKEN`;
Google certificate/provider network failures return
`503 GOOGLE_PROVIDER_UNAVAILABLE`. Google verification is mocked in automated
tests; no live Google account or credential is needed.

Apply the Google identity schema with `alembic upgrade head`. Migration
`0003_google_identity` adds the uniquely constrained `(provider, subject)`
identity mapping and makes the password hash nullable for Google-only
accounts. Keep the existing F01/F02 migration and database isolation
procedures; test migrations only against the isolated test database.

Run just the Google auth tests from `backend/` with:

```bash
python -m pytest tests/test_google_auth.py tests/test_google_auth_integration.py
```

Run the complete backend suite with `python -m pytest`.

## Routes

### Register and verify

`POST /api/v1/auth/register`

```json
{
  "email": "demo@cuevo.test",
  "password": "replace-with-a-local-demo-password"
}
```

Returns `201 Created`. The generated code is sent by email; it is never in the
HTTP response.

```json
{
  "challengeId": "a0b1c2d3-e4f5-4678-9012-3456789abcde",
  "maskedEmail": "d***@cuevo.test",
  "expiresAt": "2026-11-25T15:40:00Z",
  "resendAvailableAt": "2026-11-25T15:25:30Z",
  "account": {
    "id": "b1c2d3e4-f5a6-4789-8012-3456789abcde",
    "email": "demo@cuevo.test",
    "emailVerified": false,
    "profileCompleted": false,
    "onboardingStep": "VERIFY_EMAIL",
    "createdAt": "2026-11-25T15:25:00Z"
  }
}
```

`expiresAt` and `resendAvailableAt` are server-calculated UTC timestamps.
`POST /api/v1/auth/email/verify` accepts:

```json
{
  "email": "demo@cuevo.test",
  "challengeId": "a0b1c2d3-e4f5-4678-9012-3456789abcde",
  "code": "value-from-the-local-email"
}
```

It returns the account state with `emailVerified: true`. Codes are purpose
bound: a password-reset code cannot verify an email. Invalid, expired, replaced,
consumed, and exhausted challenges cannot be used. The public codes are
`CODE_INVALID`, `CODE_EXPIRED`, and `CODE_ALREADY_USED`; attempt exhaustion
consumes the challenge.

`POST /api/v1/auth/email/resend` accepts `{"email":"demo@cuevo.test"}` and
returns the same generic `202 Accepted` shape and message whether or not an
eligible account exists:

```json
{
  "accepted": true,
  "message": "If the account can receive a verification email, instructions will be sent.",
  "challengeId": "a0b1c2d3-e4f5-4678-9012-3456789abcde",
  "expiresAt": "2026-11-25T15:40:00Z",
  "resendAvailableAt": "2026-11-25T15:25:30Z"
}
```

For an eligible unverified account, these are the newly persisted replacement
challenge's actual values, and the message is delivered asynchronously. For an
unknown or already-verified address, the response contains an unpersisted,
random challenge ID and equivalent relative timestamps. It contains no account
object, masked email, or account-existence flag; the generated ID cannot be
verified and no email is sent. Verification still requires the matching real
email code and challenge ID.

A `429 RATE_LIMITED` response includes `Retry-After` seconds during cooldown or
when the resend rate is exceeded. A successful resend invalidates the previous
challenge; the email and response contain the replacement challenge ID and
expiry. Delivery runs in a background task; failures are logged without
message contents, and callers can retry after the resend window.

For restart recovery, persist the pending email, `challengeId`, `expiresAt`,
and `resendAvailableAt` on the client, but never persist the verification
code. After a restart, continue verification using the saved email and
challenge ID if the challenge has not expired. If pending state is missing or
expired, ask for the email again and call resend; honor `Retry-After`. There is
no email-based verification-status endpoint.

### Login, current account, renewal, and logout

`POST /api/v1/auth/login` accepts `{"email":"demo@cuevo.test","password":"..."}`.
It returns an opaque access token and a refresh token:

```json
{
  "accessToken": "opaque-access-token",
  "tokenType": "Bearer",
  "expiresAt": "2026-11-25T15:40:00Z",
  "refreshToken": "opaque-refresh-token",
  "refreshExpiresAt": "2026-12-25T15:25:00Z",
  "account": {
    "id": "b1c2d3e4-f5a6-4789-8012-3456789abcde",
    "email": "demo@cuevo.test",
    "emailVerified": true,
    "profileCompleted": false,
    "onboardingStep": "SET_UP_PROFILE",
    "createdAt": "2026-11-25T15:25:00Z"
  }
}
```

Send the access token as `Authorization: Bearer <accessToken>`.
`GET /api/v1/me` returns the current account and its separate verification and
profile-completion state. Profile completion is explicit: after email
verification, save the required profile `displayName` and `username` through
`PATCH /api/v1/me/profile`, then call
`POST /api/v1/me/onboarding/profile-completed`. The completion route rejects
an absent profile or missing required fields with `422 VALIDATION_ERROR`; it
does not create profile data. It is idempotent and returns the updated account
state. See the [profile setup sequence](./profile-and-friendship.md#profile-and-onboarding-sequence).

`POST /api/v1/auth/refresh` accepts `{"refreshToken":"<current-token>"}` and
returns a new access/refresh pair. Each refresh token is one-use. Replaying a
rotated token, including a concurrent request with that token, returns
`401 SESSION_REVOKED` and revokes that session family. A lost refresh response
therefore requires a new login; do not retry the old token.

`POST /api/v1/auth/logout` requires a valid access bearer token, revokes that
session, and returns `204 No Content`. Its access token and refresh family are
then rejected.

### Password recovery and change

`POST /api/v1/auth/password/reset/request` accepts `{"email":"demo@cuevo.test"}`
and always returns the same `202 Accepted` body:

```json
{
  "accepted": true,
  "message": "If the account exists, password-reset instructions will be sent."
}
```

No account, challenge ID, masked address, or timestamp is disclosed by this
request. If an account exists, instructions are delivered asynchronously; the
email contains the challenge ID and code. Delivery failures are logged using
only the exception type (never the email or code), and the response remains
non-enumerating. A user who does not receive a message can retry subject to the
30-second cooldown and other rate limits.

Registration sends its initial verification message synchronously and returns
`503 SERVICE_UNAVAILABLE` if local SMTP delivery fails. The account and
challenge remain persisted; after Mailpit is available, use the generic resend
operation rather than registering the same address again.

`POST /api/v1/auth/password/reset/confirm` accepts:

```json
{
  "email": "demo@cuevo.test",
  "code": "value-from-the-local-email",
  "password": "replace-with-a-new-local-demo-password"
}
```

It returns `{"changed":true}` and revokes every account session. The reset
challenge is consumed after one successful use.

`PUT /api/v1/me/password` requires a valid bearer token and accepts
`{"currentPassword":"...","newPassword":"..."}`. It returns a rotated access
and refresh pair, revokes other sessions, and invalidates the old access and
refresh credentials for the current session.

## Errors and limits

Errors use F01's `{ "error": { "code", "message", "requestId", ... } }`
envelope and `X-Request-ID`. Validation values and secrets are never returned.
Authentication-specific codes are:

| Status | Codes |
|---|---|
| 400 | `CODE_INVALID`, `CODE_EXPIRED`, `CODE_ALREADY_USED` |
| 401 | `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `SESSION_EXPIRED`, `SESSION_REVOKED` |
| 403 | `EMAIL_NOT_VERIFIED` |
| 409 | `EMAIL_ALREADY_USED` |
| 422 | `VALIDATION_ERROR` |
| 429 | `RATE_LIMITED` with `Retry-After` seconds |
| 503 | `SERVICE_UNAVAILABLE` |

Rate-limit buckets are stored in PostgreSQL so they apply across API workers.
Subjects are keyed digests, not stored email addresses or tokens. The API uses
the direct client peer address; it does not trust forwarded-IP headers.

| Operation | Production/default limit |
|---|---|
| Registration | 5 per peer IP per hour |
| Login | 5 per normalized email and 10 per peer IP per 15 minutes |
| Email verification | 5 failed attempts per challenge; 10 per email and 10 per peer IP per 15 minutes |
| Verification resend | 1 per email per 30 seconds; 5 per email per hour |
| Refresh | 10 per refresh token and 10 per peer IP per 15 minutes |
| Reset request | 1 per email per 30 seconds; 3 per email and 10 per peer IP per hour |
| Reset confirmation | 5 failed attempts per challenge; 5 per email and 10 per peer IP per hour |
| Password change | 5 per account and 10 per peer IP per 15 minutes |
| Google sign-in/link/unlink | 20 per peer IP for sign-in; 5 per account and 10 per peer IP for link/unlink per 15 minutes |

Development and test environments may override the per-window request maxima
using `AUTH_RATE_LIMIT_*` settings. Each value must be an integer from 1 to
1000; windows and the separate five-failed-attempt challenge cap are fixed.
The [safe local examples](../.env.example) raise request ceilings for
simulator/test traffic. Production rejects non-default authentication rate
limits and still refuses startup until a production email delivery adapter is
approved. Production deployment is not ready.

The setting suffixes correspond to the operation and subject in the table;
for example, `AUTH_RATE_LIMIT_LOGIN_EMAIL_15M` controls the per-email login
maximum. PostgreSQL-backed buckets, keyed subject digests, direct peer-IP
identification, and `Retry-After` calculation are unchanged.

## Local email and disposable auth demo

For persistent local demo accounts that do not send verification email, use
the [guarded development seed command](./development-demo.md). The following
steps instead demonstrate registration and email verification through local
Mailpit.

1. In `backend/`, copy `.env.example` to the ignored `.env`. Replace
   `AUTH_SECRET_KEY` with a locally generated value:

   ```bash
   python -c 'import secrets; print(secrets.token_urlsafe(32))'
   ```

   Keep the output only in the local `.env`; do not commit it.
2. Start the isolated local database and Mailpit:

   ```bash
   docker compose up -d postgres mailpit
   ```

   PostgreSQL is bound to `127.0.0.1:5432`; Mailpit SMTP is
   `127.0.0.1:1025`, and its local inbox UI is `http://127.0.0.1:8025`.
   If a port is already in use, set `POSTGRES_HOST_PORT`,
   `MAILPIT_SMTP_HOST_PORT`, or `MAILPIT_UI_HOST_PORT` when starting Compose.
   The Mailpit UI and SMTP listener are local development tools, not production
   email delivery.
3. Apply migrations and start the API:

   ```bash
   alembic upgrade head
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
4. Repeat the documented requests using `demo@cuevo.test` and a throwaway local
   password. Read the one-time code only in Mailpit, then call verify and
   login. Use `/me`, refresh, and logout as above. For recovery, use reset
   request, read the code in Mailpit, and submit reset confirmation.
5. To repeat from a clean **local development database only**, run
   `alembic downgrade 0001_initial` followed by `alembic upgrade head`, then
   repeat with the same demo address. Never run this reset against shared or
   production data. Codes are random on every request; there is no universal
   preview code. Tests use an in-memory email adapter and inspect the captured
   message without logging its active code.

The application intentionally refuses `ENVIRONMENT=production` until a
production email delivery adapter is separately approved and configured.
Social-provider verification is implemented in this backend. Profile and
friendship behavior is documented in the
[profile/friendship contract](./profile-and-friendship.md); mobile credential
storage remains a client responsibility.
