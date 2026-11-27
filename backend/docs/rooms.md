# Room lifecycle and access contract

The authenticated `/api/v1/rooms` API implements the room/event lifecycle for
Music Track Vote. It does not implement queue voting or playback. Visibility
(`public`/`private`) and vote eligibility (`everyone`/`invitees`) are distinct
server fields; public/everyone is the default. `invitees` voting is represented
for F09 but cannot currently be selected because no room-policy license
entitlement has been implemented. Location/time eligibility is deferred until
D-06 and client evidence limitations are approved. Profile city text and BLE
proximity are not GPS evidence.

All routes require an F02 bearer access token. IDs are opaque UUIDs. A host is
derived from the authenticated account and cannot be supplied in a request.
Room state and membership changes are stored transactionally. Private rooms
that a viewer cannot access use the same `404 NOT_FOUND` behavior as a missing
room; they do not appear in that viewer's search, participant lists or counts.

## Agreed behavior

- Public active rooms are discoverable and searchable by name. Any authenticated
  account may read and vote in a public/everyone room without joining. Join is
  optional and adds the account to the participant roster.
- Private rooms are accessible only to the host and accounts with an accepted
  invitation. An accepted invite grants read access, but does not add a
  participant until the invitee joins. Only the host can send/revoke an
  invitation; any existing account may be invited. Invitees accept or decline.
- A public visitor has the `visitor` role and is not included in participant
  counts. Counts include accepted participants (the host is one). Public room
  participant summaries include opaque account ID, role and join time. Private
  participants and counts are returned only to an authorized viewer.
- The host is an implicit participant and cannot leave; only the host can end
  the room. Ended is terminal. Ended rooms leave discovery, reject writes and
  remain readable to the host and existing participants/invitees.
- A private room's accepted invitation alone grants read access. The six-symbol
  join code is an additional check only for explicit code redemption; it never
  grants private access to a non-invitee. Public visitors may redeem a code to
  join, though they can also use the public Join endpoint without a code.
- Codes use the alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, are six
  cryptographically random characters, are stored only as an HMAC digest using
  the configured auth secret, expire after 24 hours, and are returned only
  when issued or rotated by the host. Rotation replaces the previous code;
  host revocation disables it immediately. Repeated redemption while active is
  safe and does not create duplicate membership. Invalid, expired, revoked and
  private non-invitee redemption responses are indistinguishable `404`s.
  Failures are throttled at five per account and IP per fixed 15-minute window;
  further failures return `429 RATE_LIMITED`.

## Routes

| Method and path | Behavior |
| --- | --- |
| `POST /api/v1/rooms` | Create; `name`, optional `description`, `visibility` (default `public`), `voteEligibility` (default `everyone`), `operationId` |
| `GET /api/v1/rooms?q=...&limit=20&cursor=...` | Search/list active rooms visible to the caller; keyset cursor ordered by opaque ID |
| `GET /api/v1/rooms/{roomId}` | Authorized room detail, roster, count, viewer role and capabilities |
| `PATCH /api/v1/rooms/{roomId}` | Host update with `expectedRevision` and `operationId`; fields `name`, `description`, `visibility`, `voteEligibility` |
| `POST /api/v1/rooms/{roomId}/join` | Join public room or accepted-invitation private room |
| `POST /api/v1/rooms/{roomId}/leave` | Remove the caller's membership; host cannot leave |
| `GET /api/v1/rooms/{roomId}/participants` | Same privacy-filtered roster/count as room detail |
| `POST /api/v1/rooms/{roomId}/end` | Host-only terminal transition |
| `POST /api/v1/rooms/{roomId}/invitations` | Host invites an existing account by `inviteeAccountId` |
| `GET /api/v1/rooms/invitations` | Caller-owned pending invitation inbox |
| `POST /api/v1/rooms/invitations/{invitationId}/respond` | Invitee accepts or declines |
| `DELETE /api/v1/rooms/{roomId}/invitations/{invitationId}` | Host revokes pending/accepted invitation and any membership |
| `POST /api/v1/rooms/{roomId}/join-code` | Host rotates/creates code; the response includes code and expiry once |
| `DELETE /api/v1/rooms/{roomId}/join-code` | Host revokes current code |
| `POST /api/v1/rooms/join-by-code` | Redeem `{ "code": "..." }`; joins a public room or an accepted-invitation private room |
| `WS /api/v1/rooms/{roomId}/events?afterRevision=...` | Authorized room invalidations; reconnect with a snapshot on a revision gap |

`limit` is 1–50, defaults to 20. Cursors are bound to the normalized search
query; malformed or mismatched cursors return `422 INVALID_CURSOR`. Search
includes active public rooms plus private rooms for their host/accepted
invitees. Private resources are filtered before pagination.

Creation example (the creator becomes host; no host ID is accepted):

```http
POST /api/v1/rooms
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Friday listening room",
  "description": "Open listening session",
  "operationId": "c1b2a3d4-e5f6-4789-8012-3456789abcde"
}
```

The response includes an opaque server-generated `id`, `revision`, host ID,
visibility, vote eligibility, participant count, `viewerRole`, and
viewer-specific `permissions`. A visitor has `canRead`, `canVote`, and
`canJoin` on an active public/everyone room, but is not a participant until
joining. `canLeave` is only true for a non-host participant; `canManage` and
`canInvite` are host-only. A create `operationId` is idempotent for the same
host and request fingerprint; using it for different input returns
`409 IDEMPOTENCY_CONFLICT`.

Join and leave requests include `expectedRevision` and a fresh `operationId`.
Stale mutations return `409 REVISION_CONFLICT`. Updating a room to private
removes existing public-only memberships while retaining the host and
accepted-invitee memberships. Invitee revocation removes private-room access
immediately, including any membership.

The exact code request is:

```http
POST /api/v1/rooms/join-by-code
Authorization: Bearer <access-token>
Content-Type: application/json

{ "code": "7KQ3WX" }
```

The code is a temporary join aid, not a private-room discovery or read
credential. A private non-invitee cannot use a valid code to learn the room ID,
name, count or activity. The response is the standard room DTO only after the
access check succeeds. Never log the submitted code.

## Invitations, notifications and realtime

Invitation create/revoke uses the existing F06 notification producer within
the room transaction; notification destinations are opaque `room` references
and do not grant access. Every destination is authorized again by the room
API. Invitation records are recipient-scoped for response, while only the host
may revoke them.

Room changes are stored as revisioned `room_events`. WebSocket delivery begins
only after commit and emits no private invitation payload or viewer-specific
capabilities. Subscriptions re-check the account session and current room
authorization on event delivery and heartbeat. A room access revocation closes
that subscriber; ending a room publishes to remaining authorized subscribers
and closes subscriptions. WebSocket fan-out is process-local, as with
playlists; a multi-worker deployment needs a shared broker before claiming
cross-process delivery.

## Development fixture

Run the existing guarded `python -m app.dev_seed` command from `backend/`.
It creates one public room hosted by Alex Demo and one private room hosted by
Jamie Demo with Alex as an accepted invitee. Stable IDs and seed markers make
each sample create-if-absent: reruns skip existing resources, preserving edits,
and do not delete unrelated data. Seeding runs only against a local loopback
`cuevo_dev` database in development, never at startup, in production, or in a
migration. See [development demo data](./development-demo.md).

## Not included

This feature does not implement F09 track suggestions/votes, queue ranking,
host playback controls, mobile API wiring, location/time eligibility, trusted
GPS evidence, BLE room lookup, or OS push delivery. These remain separate
features/decisions.
