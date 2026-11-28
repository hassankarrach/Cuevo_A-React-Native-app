# Cuevo Google Sign-In: frontend handoff

## Ownership and scope

Native Google Sign-In is frontend/client work: it belongs in the iOS
application, its navigation and authentication state, and its secure
credential storage. The backend branch owns Google ID-token verification,
account identity persistence, explicit linking/unlinking, and Cuevo session
issuance/revocation. Do not add a web frontend or browser-based OAuth.

The current checkout has no iOS project or mobile source. This handoff is for
the frontend teammate to apply to the existing iOS/React Native app source;
it does not create an iOS application in the backend repository.

Google is the only approved social provider. Facebook is out of scope.

## Approved native configuration

Configure the Google Sign-In iOS SDK with:

| Setting | Value |
|---|---|
| `GIDClientID` | `699911618982-o9n9v5s8t8ebcsuqi3s24du0hjgea6t8.apps.googleusercontent.com` |
| `GIDServerClientID` | `699911618982-tbvbceq7c04nsgnh656ifabrdt3ep7iq.apps.googleusercontent.com` |
| Bundle identifier | `com.cuevo.app` |
| URL scheme | `com.googleusercontent.apps.699911618982-o9n9v5s8t8ebcsuqi3s24du0hjgea6t8` |

The backend Web OAuth client ID is the expected ID-token audience for native
iOS sign-in. It does **not** mean there is a web frontend. No Web Client
Secret is required. Backend deployment must set `GOOGLE_IOS_CLIENT_ID` and
`GOOGLE_SERVER_CLIENT_ID`; if either is missing the API returns
`503 GOOGLE_AUTH_NOT_CONFIGURED`.

Use the Google native Sign-In SDK appropriate to the app's current native
build/Expo setup. Configure the bundle identifier and URL scheme in the
existing iOS target/configuration. Do not introduce a browser auth flow or
hard-code app secrets. Check the app source and build workflow before choosing
or adding an SDK dependency.

## API contract

Base path: `/api/v1`. Send JSON using camelCase. All failures use F01's
`{"error": {...}}` envelope and include a `requestId`. Only send requests to
the configured HTTPS backend outside local development.

### Sign in or create a Google account

Use the native SDK to obtain an ID token, then send:

`POST /api/v1/auth/google`

```json
{
  "idToken": "<google-id-token-from-ios>"
}
```

On success, the response is the existing F02 `AuthTokensResponse`:

```json
{
  "accessToken": "<cuevo-access-token>",
  "tokenType": "Bearer",
  "expiresAt": "2026-11-25T18:45:00Z",
  "refreshToken": "<cuevo-refresh-token>",
  "refreshExpiresAt": "2026-12-25T18:30:00Z",
  "account": {
    "id": "b1c2d3e4-f5a6-4789-8012-3456789abcde",
    "email": "person@example.com",
    "emailVerified": true,
    "profileCompleted": false,
    "onboardingStep": "SET_UP_PROFILE",
    "createdAt": "2026-11-25T18:30:00Z"
  }
}
```

The tokens above are shape examples, not usable credentials. Store Cuevo
access and refresh tokens using the app's approved secure storage. Do not use
the Google ID token as a Cuevo API bearer token, persist it as the app's
session, or trust client-supplied Google email/name/avatar/subject.

Backend behavior:

- A previously linked Google identity signs in its existing Cuevo account.
- A new Google identity with an unused verified email creates an account.
- If that verified email belongs to an existing Cuevo account, the API returns
  `409 ACCOUNT_LINK_REQUIRED`; it does not create a duplicate or link
  automatically.
- Invalid ID tokens return `401 INVALID_GOOGLE_TOKEN`.
- Missing server configuration returns `503 GOOGLE_AUTH_NOT_CONFIGURED`;
  provider verification outages return `503 GOOGLE_PROVIDER_UNAVAILABLE`.

The account-link-required response includes:

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

When this occurs, show a clear prompt and authenticate through the existing
Cuevo login method. Then offer an explicit Google-link action. Never retry
sign-in by silently attaching Google to the account that shares its email.

### Linked methods

`GET /api/v1/me/linked-accounts` requires the Cuevo access bearer token:

```json
{
  "passwordEnabled": true,
  "googleLinked": true
}
```

Use this endpoint to display current authentication methods. Do not infer
link state from locally stored Google credentials.

### Explicitly link Google

The current backend link contract requires the authenticated Cuevo user to
reauthenticate with their existing password, plus a Google ID token obtained
from native sign-in:

`POST /api/v1/me/linked-accounts/google`

Headers: `Authorization: Bearer <cuevo-access-token>`

```json
{
  "idToken": "<fresh-google-id-token-from-ios>",
  "currentPassword": "<current-cuevo-password>"
}
```

Prompt for the Cuevo password when needed; never log it or store it outside
approved secure credential handling. The backend verifies the ID token
independently. `409 GOOGLE_IDENTITY_IN_USE` means that Google identity belongs
to another Cuevo account. `409 GOOGLE_ALREADY_LINKED` means it is already
linked to this account. Do not merge accounts or try another account based on
the response.

On success, the endpoint returns a fresh `AuthTokensResponse`. Replace the
current Cuevo credentials in secure storage as one coordinated update:
the previous access and refresh tokens for this session become invalid. All
other active account sessions are revoked. If replacement fails, discard
stale credentials and require a new login; do not keep retrying stale tokens.

### Explicitly unlink Google

`POST /api/v1/me/linked-accounts/google/unlink` requires the Cuevo access
bearer token and exactly one reauthentication method:

Password reauthentication:

```json
{
  "currentPassword": "<current-cuevo-password>"
}
```

Or reauthenticate with the linked Google account using a fresh ID token:

```json
{
  "idToken": "<fresh-google-id-token-from-ios>"
}
```

For Google reauthentication, the ID token must belong to the currently linked
Google identity and have been issued within the last five minutes. Confirm
intent before unlinking. `409 LAST_LOGIN_METHOD` means the account needs
another usable login method first; keep Google linked and explain what the
user can do. Unlinking removes only the identity association, not the Cuevo
account. On success, update the current Cuevo token pair from the response;
the previous pair is invalidated and other active sessions are revoked.

## Client behavior and security requirements

- Keep native Google authorization separate from Cuevo account/session state.
- Submit only the Google ID token to sign-in/link endpoints. Do not send
  client profile fields as proof or use email equality to link.
- Handle cancellation as a user cancellation, not as a server error.
- Handle network errors, `401`, `409`, `503`, and malformed/unexpected API
  responses without reporting a false successful sign-in.
- Use `Authorization: Bearer <accessToken>` for protected endpoints and the
  existing F02 refresh/logout behavior. Coordinate refreshes; a reused
  refresh token revokes its session family.
- Replace secure session credentials after successful link/unlink responses.
- Never display the Google provider as enabled when API configuration or the
  native SDK integration is unavailable.
- Do not add Facebook or browser OAuth.

## Acceptance and verification

1. Native iOS sign-in completes and obtains an ID token using the configured
   iOS and server client IDs, bundle ID and URL scheme.
2. A new Google account signs in and reaches the existing onboarding flow
   using the backend's `account` state.
3. An existing linked Google identity signs in to the same Cuevo account.
4. An email collision displays the explicit-link path; it never silently
   merges or creates a duplicate.
5. Explicit linking requires existing Cuevo authentication and password
   reauthentication; identity-in-use errors are handled safely.
6. Unlinking requires reauthentication and preserves at least one usable
   login method; a Google-only account cannot unlink its last method.
7. Link/unlink token rotation is reflected in secure storage; revoked sessions
   are not reused.
8. Existing email/password and recovery flows continue to work.
9. Run the app's existing typecheck, lint, iOS build and relevant client tests.
   Record exact commands/results and perform a device/simulator sign-in test
   after Google Console bundle ID and URL-scheme configuration is confirmed.

The backend tests do not require live Google credentials and mock provider
verification. Native SDK/device verification requires the frontend app,
configured iOS target, and access to the Google Cloud project.

## Backend references

- [Backend auth lifecycle/API contract](backend/docs/auth-lifecycle.md)
- [Backend setup and verification](backend/README.md)
