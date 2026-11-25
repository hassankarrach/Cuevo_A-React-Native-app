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
returns a generic `202 Accepted` response whether or not an eligible account
exists. A `429 RATE_LIMITED` response includes `Retry-After` during cooldown or
when the resend rate is exceeded. A successful resend replaces the old
challenge; the email includes the new challenge ID and expiry timestamp.
Delivery runs in a background task; failures are logged without message
contents, and callers can retry after the resend window.

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
profile-completion state. `POST /api/v1/me/onboarding/profile-completed` marks
onboarding profile setup complete after email verification; it does not create
or own profile data.

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

| Operation | Limit |
|---|---|
| Registration | 5 per peer IP per hour |
| Login | 5 per normalized email and 10 per peer IP per 15 minutes |
| Email verification | 5 failed attempts per challenge; 10 per email and 10 per peer IP per 15 minutes |
| Verification resend | 1 per email per 30 seconds; 5 per email per hour |
| Refresh | 10 per refresh token and 10 per peer IP per 15 minutes |
| Reset request | 1 per email per 30 seconds; 3 per email and 10 per peer IP per hour |
| Reset confirmation | 5 failed attempts per challenge; 5 per email and 10 per peer IP per hour |
| Password change | 5 per account and 10 per peer IP per 15 minutes |

## Local email and repeatable demo

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
Social-provider verification, profile/friendship data ownership, and mobile
credential storage remain out of scope.
