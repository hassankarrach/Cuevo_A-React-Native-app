# Proposed shared API contract

This document records proposed conventions for frontend review. Product routes,
DTOs, exact authentication transport, resource-specific rules, and the
WebSocket delivery guarantees are not approved merely because they appear here
or in generated OpenAPI. No product routes are implemented by this contract
slice. Preserve `GET /health`; it remains outside the proposed `/api/v1`
product namespace and retains its current readiness response.

## HTTP and JSON conventions

| Concern | Proposal |
| --- | --- |
| Product paths | `/api/v1`; preserve `/health` |
| JSON property names | camelCase |
| IDs | Opaque strings; UUIDs may be used but clients must not depend on their format |
| Timestamps | UTC RFC 3339 |
| Durations | Integer milliseconds with an `Ms` suffix, for example `durationMs` |
| Pagination | `{ "items": [], "nextCursor": null }`; page size is bounded and ordering is stable and documented |
| Retryable mutations | Send the expected resource revision and an operation/idempotency ID; server-side atomicity and deduplication policy are specified per operation |
| Capabilities | Include viewer-specific `permissions`; enforce authorization again on each operation |

These are proposed wire conventions, not a promise that every product DTO or
route already exists. Date-only values, limits, cursor expiry, retry retention,
and individual resource permissions require review with the frontend teammate.

## Error behavior

Implemented HTTP failures use this envelope:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "The resource has changed. Refresh and try again.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": {
      "currentRevision": "opaque-revision"
    }
  }
}
```

`fieldErrors` is optional and contains only `{ field, code, message }`; submitted
values and Pydantic error context are never returned. `details` is optional and
must contain only explicitly safe, public values. Do not copy exception text,
database errors, query text, credentials, bearer/refresh tokens, challenge
material, or secrets into a public message or details. Resource-specific codes
and safe details can be added for domain behavior. For private resources,
missing and inaccessible resources must share the same public `404` code,
message, and response behavior; do not use details or distinct codes to reveal
existence.

| Status | Stable default code | Default safe message |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | The request could not be processed. |
| 401 | `AUTHENTICATION_REQUIRED` | Authentication is required. |
| 403 | `FORBIDDEN` | You are not allowed to perform this action. |
| 404 | `NOT_FOUND` | The requested resource was not found. |
| 405 | `METHOD_NOT_ALLOWED` | This method is not allowed for the resource. |
| 409 | `REVISION_CONFLICT` | The resource has changed. Refresh and try again. |
| 422 | `VALIDATION_ERROR` | Request validation failed. |
| 429 | `RATE_LIMITED` | Too many requests. Try again later. |
| 503 | `SERVICE_UNAVAILABLE` | The service is temporarily unavailable. |
| 500 | `INTERNAL_ERROR` | An unexpected error occurred. |
| Other framework HTTP status | `HTTP_ERROR` | The request could not be completed. |

`Retry-After` may be returned for a `429` when the server has a safe retry
delay. The exact authentication challenge/header, rate-limit policy, and
resource-specific catalog are pending approval. Suggested domain codes from
the handoff (such as `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`,
`ROOM_ENDED`, `VOTING_NOT_ELIGIBLE`, and `PROVIDER_UNAVAILABLE`) remain
proposals. Do not expose account-enumeration details unless the product
security policy explicitly permits them.

The `requestId` in the envelope is also sent as `X-Request-ID`. A canonical
UUID supplied in `X-Request-ID` is accepted as a correlation ID; malformed
values are replaced with a generated UUID. It is not an authenticated user,
account, or authorization identity and must never be treated as one. Unknown
exceptions produce a generic `500` envelope; only the request ID and exception
type are logged by the generic error boundary, not exception messages or
tracebacks. `Retry-After`, when supplied for `429`, is expressed in seconds.

`GET /health` is intentionally an exception to the general 503 error envelope:
its existing 503 payload describes database readiness and remains unchanged.
The middleware still adds `X-Request-ID` to health responses.

## Proposed WebSocket event envelope

Realtime payloads should use a common envelope, subject to frontend review:

```json
{
  "eventId": "opaque-event-id",
  "type": "resource.updated",
  "occurredAt": "2026-01-01T12:00:00Z",
  "resource": {
    "type": "resource-type",
    "id": "opaque-resource-id",
    "revision": "opaque-revision"
  },
  "data": {}
}
```

`data` is a resource-specific payload and must be authorized and privacy-filtered
for each subscriber. Event ordering, replay/resume cursors, delivery guarantees,
reauthentication, reconnect/resync, and acknowledgement behavior are unresolved
and must not be inferred from this example. Event IDs are opaque and are not
operation IDs or proof of authorization.

## OpenAPI and approval boundary

Generated OpenAPI publishes reusable response examples for the shared status
mapping and root-level `x-proposed-api-conventions` and
`x-proposed-websocket-event-envelope` extensions. These extensions make the
proposals machine-discoverable; they do not approve product routes or schemas.
Review the examples, error-code catalog, auth/session policy, and event
delivery behavior with the frontend teammate before client integration.
