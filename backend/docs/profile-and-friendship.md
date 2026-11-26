# Profiles and friendships

The backend owns the profile/friendship feature and its Alembic migration. It
reuses the existing F02 `accounts` and authenticated-session tables; it does
not create another account, session, or provider model. All routes require the
F02 bearer access token. The acting account always comes from authentication,
never from a request-body actor ID.

## Profile contract

| Field | Rule |
| --- | --- |
| `displayName` | Required to create a profile; 1–40 characters after trimming |
| `username` | Required to create a profile; ASCII letters, digits and `_`; 3–30 characters; trimmed and normalized to lowercase |
| `bio` | Optional; at most 500 characters; empty input is stored as `null` |
| `location` | Optional; at most 100 characters; empty input is stored as `null` |
| `preferredGenres` | At most 20 unique values, each 1–50 characters after trimming; uniqueness ignores case |
| `privacy` | `public`, `friends` or `private`; new profiles default to `private` |

Length limits count characters, not UTF-8 bytes. Usernames are globally unique
after lowercase normalization. Users can change them at any time; the former
username is released immediately. Duplicate usernames return `409
USERNAME_UNAVAILABLE`.

Display name, username and privacy are always visible on an existing profile.
The profile privacy setting applies to bio, location and preferred genres:

| Viewer | `public` | `friends` | `private` |
| --- | --- | --- | --- |
| Profile owner | Visible | Visible | Visible |
| Accepted friend | Visible | Visible | Hidden |
| Stranger | Visible | Hidden | Hidden |

Hidden keys are omitted from the response, not returned as `null`. The client
must use the viewer-specific `permissions` and `relationshipStatus` fields and
must not infer edit access from visible data. Email verification and
`profileCompleted` remain separate account states; profile edits do not mark
onboarding complete or verify an email.

Profile reads return an opaque `accountId`, never an email address. A missing
profile and a profile that does not exist share the generic `404 NOT_FOUND`.
The slice does not provide profile search, public profile counts, or friend
counts, so those aggregates cannot reveal hidden profiles.

The UI's Verified badge is not returned by this API. A future distinct
verified-account status must be approved and implemented before a Verified
badge can be exposed; it is not inferred from `emailVerified`.

### Routes

| Method and path | Behavior |
| --- | --- |
| `GET /api/v1/me/profile` | Read the authenticated user's profile |
| `PATCH /api/v1/me/profile` | Create or update display name, username, bio and location; creation requires display name and username |
| `PATCH /api/v1/me/privacy` | Update the profile visibility setting |
| `PUT /api/v1/me/music-preferences` | Replace the preferred genre list |
| `GET /api/v1/profiles/{account_id}` | Read a profile with privacy filtering and viewer capabilities |

A profile response includes:

```json
{
  "accountId": "opaque-account-id",
  "displayName": "Alex Example",
  "username": "alex_example",
  "privacy": "friends",
  "relationshipStatus": "friends",
  "bio": "Live music fan",
  "location": "Wellington",
  "preferredGenres": ["Jazz", "Ambient"],
  "permissions": {
    "canEdit": false,
    "canViewPrivateFields": true,
    "canRequestFriendship": false,
    "canRespondToFriendRequest": false,
    "canRemoveFriend": true
  }
}
```

For a stranger viewing a `friends` or `private` profile, `bio`, `location` and
`preferredGenres` are absent from the JSON object. No avatar URL is present:
avatar upload, replacement and deletion are deferred until an object-storage
provider, durable URL format, access policy, size limit and MIME allowlist are
approved. Local `file://` paths and ephemeral app-server files are not valid
avatar references. Inaccessible/deleted-image behavior cannot be implemented
or tested before that storage contract exists.

## Friendship contract

Only one relationship row exists per unordered account pair. `GET
/api/v1/profiles/{account_id}` and `GET
/api/v1/friends/{account_id}/relationship` report one of `self`, `friends`,
`outgoing_pending`, `incoming_pending` or `none`. Relationship lookup returns
`none` for an unknown account ID rather than distinguishing it from an
unrelated existing account.

| Operation | Contract |
| --- | --- |
| Request | `POST /api/v1/friend-requests` with `targetAccountId`; self-requests are invalid |
| Duplicate outgoing request | `409 FRIEND_REQUEST_EXISTS`; no second request is created |
| Request when already friends | `409 ALREADY_FRIENDS` |
| Crossed requests | A new request in the opposite direction atomically accepts the pending request; result is `friends` |
| Accept | `POST /api/v1/friend-requests/{request_id}/accept`; only the recipient can accept |
| Decline | `POST /api/v1/friend-requests/{request_id}/decline`; only the recipient can decline |
| Cancel | `POST /api/v1/friend-requests/{request_id}/cancel`; only the requester can cancel |
| Remove/unfriend | `DELETE /api/v1/friends/{account_id}`; either friend may remove the relationship |

Accepting is valid only for a pending request. Declined, cancelled and removed
relationships are deleted, so a later request creates a fresh relationship.
Unfriending immediately changes relationship status to `none` and removes
access to `friends`-visible fields; no unrelated account data is deleted.
Actions on a request by an unrelated account return `404`; an action by the
wrong participant returns `403`.

`GET /api/v1/friends`, `/api/v1/friend-requests/incoming` and
`/api/v1/friend-requests/outgoing` return `{ "items": [], "nextCursor": null }`.
Pages are ordered by counterpart account ID and accept `limit` from 1 to 50
(default 20), plus an optional opaque UUID cursor. Cards contain only account
ID, display name and username; profile-private fields and counts are not
included.

## Reproducible profile test accounts

From `backend/`, with the isolated PostgreSQL test database configured as
described in the [backend setup guide](../README.md), run:

```bash
python -m pytest tests/test_profiles_integration.py
```

The integration fixture creates verified disposable users through the actual
F02 registration/verification/login routes using an in-memory email adapter,
creates profiles and friendships, and drops its test tables afterward. It
covers owner/friend/stranger visibility for every privacy state, request
transitions, cross-account mutation rejection, and invalid profile values. It
does not create accounts in the development database.

For manual API use, start the API and Mailpit, register a reserved
`@example.com` test address, retrieve the one-time code from Mailpit, verify it, and
log in as documented in the [auth lifecycle guide](./auth-lifecycle.md). Use
the returned access token with:

```bash
curl -X PATCH http://127.0.0.1:8000/api/v1/me/profile \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Alex Example","username":"alex_example","bio":"Live music fan"}'

curl -X PUT http://127.0.0.1:8000/api/v1/me/music-preferences \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"preferredGenres":["Jazz","Ambient"]}'

curl -X PATCH http://127.0.0.1:8000/api/v1/me/privacy \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"privacy":"friends"}'
```

Never use a real or production account for tests or demos.
