# Playlist API and realtime contract

The playlist editor implements Music Room V.2.3 (p.9) using the existing
FastAPI/PostgreSQL service, F01 error envelope, F02 account IDs, F05 catalog
IDs, and F06 notification producer. The backend is authoritative; clients send
operations, not replacement playlist snapshots. Route IDs are opaque UUIDs and
JSON fields use camelCase.

## Policy and privacy

- New playlists default to `visibility: "public"` and
  `editPolicy: "everyone"`.
- Any authenticated account can read and edit a public/everyone playlist.
- A private playlist is readable only by its owner and invitees whose
  invitation status is `accepted`. A pending invitation is not visibility.
  Acceptance grants private read access. Declining or revoking does not.
- The owner always has full control. `editPolicy: "owner"` additionally
  restricts entry edits to the owner. `editPolicy: "collaborators"` restricts
  entry edits to accepted invitees and requires the owner's active
  `playlist_invited_edit` entitlement. No public API can grant that
  entitlement; the trusted entitlement integration manages
  `playlist_edit_licenses`. An expired/revoked entitlement immediately removes
  invited-user edit capability; the owner can still edit and change policy.
- `everyone` means every account allowed to read that playlist. On private
  playlists, that is the owner and accepted invitees, not all accounts.
- Only the owner can edit metadata, visibility, edit policy, invitations, or
  delete the playlist. Entry authorship is recorded separately from playlist
  ownership.
- Unauthorized private reads, list/search results, and WebSocket subscriptions
  use privacy-safe not-found behavior. List/search filter visibility in SQL
  before pagination; no total count is returned. Invitation inbox rows expose
  only the invitation reference/status needed to respond, not the private
  playlist name or entries.
- Repeated occurrences of a song are rejected. Each entry has a stable ID;
  entry IDs are distinct from catalog song IDs.
- Metadata is trimmed; names are 1–100 characters and descriptions are
  0–1000 characters. Blank names are invalid; blank descriptions are allowed.
- Deletion is a hard delete. Entries, invitations, operation history and
  playlist events cascade; entry authorship becomes null if an account is
  deleted. A small owner-scoped deletion receipt is retained for retry
  idempotency. No archive state is exposed.

## Snapshots and discovery

| Method and path | Behavior |
| --- | --- |
| `POST /api/v1/playlists` | Create; `operationId` is required |
| `GET /api/v1/playlists?limit=20&cursor=...&q=...` | Authorized list/search, stable UUID ordering; limit 1–50 |
| `GET /api/v1/playlists/{playlistId}` | Current authorized snapshot |
| `PATCH /api/v1/playlists/{playlistId}` | Owner-only metadata/policy update |
| `DELETE /api/v1/playlists/{playlistId}` | Owner-only hard delete |

`q` searches the trimmed playlist name, case-insensitively, with literal
`%`, `_`, and backslash characters escaped. Cursors are bound to the normalized
query and UUID keyset; invalid/mismatched cursors return `422 INVALID_CURSOR`.
Private records are filtered before the page limit is applied. A playlist
snapshot has this shape:

```json
{
  "id": "c1b2a3d4-e5f6-4789-8012-3456789abcde",
  "name": "Shared mix",
  "description": "",
  "ownerAccountId": "b1c2d3e4-f5a6-4789-8012-3456789abcde",
  "visibility": "public",
  "editPolicy": "everyone",
  "collaboratorIds": [],
  "entries": [
    {
      "id": "d1b2a3d4-e5f6-4789-8012-3456789abcde",
      "songId": "e9466fa3-3e0a-5f93-8d4a-1ff70a27904d",
      "addedByAccountId": "b1c2d3e4-f5a6-4789-8012-3456789abcde",
      "position": 0,
      "createdAt": "2026-11-27T14:00:00Z"
    }
  ],
  "revision": "2",
  "updatedAt": "2026-11-27T14:00:00Z",
  "permissions": {
    "canRead": true,
    "canEdit": true,
    "canManage": false
  }
}
```

`permissions` are viewer-specific, computed on each authorized HTTP response,
and are never included in shared WebSocket events. Every mutation repeats the
server-side authorization check.

Create example:

```http
POST /api/v1/playlists
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "name": "Shared mix",
  "description": "",
  "visibility": "public",
  "editPolicy": "everyone",
  "operationId": "a1b2a3d4-e5f6-4789-8012-3456789abcde"
}
```

Omitted visibility and edit policy have those same defaults. The operation ID
is a UUID idempotency key scoped to the authenticated owner. Reusing the key
with different input returns `409 IDEMPOTENCY_CONFLICT`; retrying identical
input returns the original playlist.

## Entries and invitations

All edits carry `expectedRevision` (the decimal string in the last snapshot)
and a client-generated UUID `operationId`. The server locks the playlist row,
validates authorization and revision, applies the operation atomically, records
the operation/event, increments the revision, and commits before publishing.
Reusing an operation ID with different actor or request data returns
`409 IDEMPOTENCY_CONFLICT`. Identical retries do not apply twice. Operation
deduplication is retained while the playlist exists; deletion retries use the
owner-scoped deletion receipt.

| Method and path | Request fields | Permission |
| --- | --- | --- |
| `POST /api/v1/playlists/{playlistId}/entries` | `expectedRevision`, `operationId`, `songIds` (1–100) | Effective editor |
| `DELETE /api/v1/playlists/{playlistId}/entries/{entryId}` | `expectedRevision`, `operationId` | Effective editor |
| `PUT /api/v1/playlists/{playlistId}/entries/order` | `expectedRevision`, `operationId`, complete ordered `entryIds` | Effective editor |
| `POST /api/v1/playlists/{playlistId}/invitations` | `expectedRevision`, `operationId`, `inviteeAccountId` | Owner |
| `GET /api/v1/playlists/invitations` | none | Authenticated invitee |
| `POST /api/v1/playlists/invitations/{invitationId}/respond` | `expectedRevision`, `operationId`, `response: "accepted" \| "declined"` | Invitee |
| `DELETE /api/v1/playlists/{playlistId}/invitations/{invitationId}` | `expectedRevision`, `operationId` | Owner |

Add validates all catalog IDs and duplicate-song policy before inserting any
entry. Reorder must include every current stable entry ID exactly once.
Positions are compact, zero-based and committed in the same transaction.
Invitation send, accept/decline and revoke are revisioned playlist mutations.
Only accepted invitations grant private visibility or collaborator edit
capability. Notifications use the durable F06 producer and typed playlist
reference; they do not grant access.

Successful entry/invitation mutation responses are current authorized playlist
snapshots (except send/respond/revoke, which return the invitation row).
Stale revisions return `409 REVISION_CONFLICT` with a safe
`details.currentRevision`; clients fetch the authorized snapshot and explicitly
resolve/retry rather than replacing the full playlist.

Other stable errors:

| Status | Code | Meaning |
| --- | --- | --- |
| 401 | `AUTHENTICATION_REQUIRED`, `SESSION_EXPIRED`, `SESSION_REVOKED` | Missing/invalid bearer session |
| 403 | `FORBIDDEN` | Authorized reader lacks the requested edit/manage capability |
| 403 | `LICENSE_REQUIRED` | Owner has no active invited-edit entitlement |
| 404 | `NOT_FOUND` | Missing resource or inaccessible private playlist |
| 404 | `SONG_NOT_FOUND` | One or more catalog song IDs are unavailable |
| 409 | `REVISION_CONFLICT` | Expected revision is stale; includes `currentRevision` |
| 409 | `IDEMPOTENCY_CONFLICT` | Reused operation ID has different actor/input |
| 409 | `DUPLICATE_SONG` | Playlist already contains a requested song |
| 409 | `ENTRY_SET_CHANGED` | Reorder omitted/added an entry ID |
| 409 | `INVITATION_EXISTS` | Invitee already has a pending/accepted invitation |
| 409 | `INVITATION_NOT_PENDING`, `INVITATION_NOT_ACTIVE` | Invitation cannot make that transition |
| 422 | `VALIDATION_ERROR` | Invalid field, identifier, or request shape |
| 422 | `INVALID_CURSOR` | Invalid/query-mismatched page cursor |

Every HTTP error uses F01's common error envelope and request ID. Validation
messages do not contain submitted sensitive data.

## WebSocket delivery and recovery

Connect to `wss://<api>/api/v1/playlists/{playlistId}/events` with the same
bearer access token in the `Authorization` header. Tokens are not accepted in
query strings. An optional `afterRevision` is a decimal revision string.
Unauthorized private subscriptions close with WebSocket code `4404`; invalid
or expired/revoked credentials close with `4401`. The authenticated session
and resource access are rechecked before each event; session logout/token
rotation and invitation revocation close the active subscription.

Committed edits and invitation changes publish this shared envelope in
per-playlist revision order:

```json
{
  "eventId": "f1b2a3d4-e5f6-4789-8012-3456789abcde",
  "type": "playlist.updated",
  "resourceType": "playlist",
  "resourceId": "c1b2a3d4-e5f6-4789-8012-3456789abcde",
  "revision": "3",
  "occurredAt": "2026-11-27T14:01:00Z",
  "operationId": "a1b2a3d4-e5f6-4789-8012-3456789abcde",
  "payload": { "change": "entries" }
}
```

Invitation events use `type: "playlist.invitation.updated"` and a
non-viewer-specific `{ "change": "invitation" }` payload. Event payloads are
invalidation hints, not snapshots or permission grants. Events are persisted
transactionally before the process-local broadcaster sends them. The current
implementation does not replay a retained event cursor: if the connection has
no revision, presents a revision different from the current revision, misses
an event, or has an expired cursor, it receives `playlist.resync_required`
and must fetch the latest authorized snapshot. Reconnect also rechecks
authorization. Permission revocation closes an active subscription; visibility
changes and hard deletion similarly revalidate/close readers. Slow subscribers
are disconnected rather than receiving an unbounded queue.

The broadcaster is process-local. Deployments with multiple API worker
processes need a shared event broker before claiming cross-process WebSocket
fan-out; HTTP/database mutation and snapshot authorization remain durable and
authoritative.

## Development fixture

`python -m app.dev_seed` extends the existing F02 guarded command. It adds at
most one public sample playlist owned by Alex Demo, with Jamie Demo as an
accepted collaborator and three approved F05 catalog song IDs. Stable IDs and
the seed marker make reruns additive; a found seed playlist is never reset or
overwritten. The command remains restricted to a loopback `cuevo_dev` database
in development mode, and migrations never seed fixtures. See
[development demo data](./development-demo.md).

## Frontend integration note

The handoff reports the mobile create flow currently starts with a private
playlist. That client default does not match the subject or API. Correct the
client integration to submit/use `public` and `everyone` by default; this
backend task intentionally does not modify mobile code or private mock data.
