# Cuevo backend

Cuevo is the repository name for the project specified as **Music Room** in the
project subject. The backend is the authoritative service-data layer for the
React Native/Expo frontend.

## Requirements

- Python 3.12 (the pinned dependencies were verified on this version)
- Docker with Docker Compose (recommended for PostgreSQL)
- PostgreSQL 16 if running PostgreSQL directly instead of Docker

## Linux/macOS setup

From the repository root:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

For local authentication, replace `AUTH_SECRET_KEY` in `.env` with a
locally-generated key:

```bash
python -c 'import secrets; print(secrets.token_urlsafe(32))'
```

Keep the generated value private and do not commit `.env`.

Start the local development database:

```bash
docker compose up -d postgres
docker compose ps
```

For email/password auth development, also start the local-only Mailpit inbox:

```bash
docker compose up -d mailpit
```

The SMTP listener is bound to `127.0.0.1:1025`; view development messages at
`http://127.0.0.1:8025`. No real email vendor is configured. If local ports
conflict, set `POSTGRES_HOST_PORT`, `MAILPIT_SMTP_HOST_PORT`, or
`MAILPIT_UI_HOST_PORT` when invoking Compose.

The Compose setup creates local `cuevo_dev` and isolated `cuevo_test`
databases and publishes PostgreSQL only on localhost. The passwords and
accounts are development-only placeholders.
Do not use them outside local development or commit a real `.env` file.

Initialize and upgrade the development database:

```bash
alembic upgrade head
```

For a fresh, isolated PostgreSQL instance and test database, use a dedicated
Compose project name and unused local port. Its volume is separate from the
normal development database:

```bash
POSTGRES_HOST_PORT=55432 docker compose -p cuevo-auth-tests up -d --wait postgres
POSTGRES_HOST_PORT=55432 docker compose -p cuevo-auth-tests exec -T postgres pg_isready -U cuevo -d cuevo_test
ENVIRONMENT=test alembic upgrade head
```

In test mode, `TEST_DATABASE_URL` is mandatory and must target a different
database from `DATABASE_URL`. Alembic and the application use only the test URL
in that mode; a missing or identical target fails configuration instead of
falling back to the development database. Set `TEST_DATABASE_URL` in the
ignored `.env` to the same localhost port (55432 in this example) for Alembic.
The test suite overwrites inherited database URLs with local-only values; use
`CUEVO_TEST_DATABASE_PORT=55432 python -m pytest` to run it against this custom
port. The test host and database name are fixed to `127.0.0.1` and
`cuevo_test`.

Start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

OpenAPI is available at `http://127.0.0.1:8000/docs`.

## API and authentication

The backend exposes F01's shared error envelope and request ID. The
email/password account lifecycle is implemented under `/api/v1`; its routes,
DTOs, approved challenge/session rules, errors, rate limits and examples are
documented in the [auth lifecycle contract](docs/auth-lifecycle.md). It is not
wired to mobile screens or credential storage. Google native ID-token
verification, sign-in and explicit account link/unlink are implemented under
`/api/v1`; configure the optional public Google client IDs in `.env` to enable
them. The current checkout contains no iOS project or mobile source, so
native SDK integration remains a client-side task. Facebook is not supported.
Authenticated profile/privacy, avatar, music-preference, friendship and
relationship routes are implemented and documented in the
[profile/friendship contract](docs/profile-and-friendship.md). Avatars use
durable PostgreSQL storage, validated JPEG/PNG/WebP bytes, a 2 MiB cap, and
profile-privacy-gated reads. Other product routes and shared proposals for
pagination, revisions, viewer permissions and WebSocket delivery still require
review except for the implemented playlist contract.
See the [API contract](docs/api-contract.md) for the shared envelope and
remaining approval boundaries. The [playlist and realtime contract](docs/playlists.md)
documents CRUD/search, policy and invitation authorization, revisioned
operations, idempotency, WebSocket events and snapshot resynchronization.
Authenticated in-app notifications provide recipient-scoped durable unread/read
state and typed resource references. F07 produces notifications for playlist
invitation changes. The API does not send OS push notifications or register
native device tokens; see the [notification contract](docs/notifications.md).

The public song catalog is available at `GET /api/v1/songs` and
`GET /api/v1/songs/{songId}`. Its source is the approved, static metadata
artifact at `backend/data/songs.json`; it is not refreshed automatically.
Migrations create an empty catalog. The explicit `python -m
app.catalog.importer` command imports the approved records into a guarded local
development database only. `python -m app.dev_seed` adds the persistent demo
accounts, deterministic three-song F07 fixture, and one public collaborative
playlist. It is additive/idempotent and skips existing or user-modified demo
resources. Neither command runs in production or from a migration. See [song
catalog provenance and API contract](data/SONG_CATALOG.md) and [development
demo data](docs/development-demo.md). Provider IDs are metadata references, not
internal song IDs or playable media; artwork URLs and image files are not
served, and no playback SDK is included.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL URL for the selected local development environment |
| `TEST_DATABASE_URL` | Test mode | Isolated PostgreSQL URL required when `ENVIRONMENT=test` |
| `ENVIRONMENT` | No | `development`, `test`, or `production`; defaults to `development` |
| `AUTH_SECRET_KEY` | Yes | Private random key (at least 32 characters) for keyed challenge, token and rate-limit digests |
| `EMAIL_SMTP_HOST` | No | Local SMTP host; defaults to `127.0.0.1` |
| `EMAIL_SMTP_PORT` | No | Local SMTP port; defaults to `1025` |
| `EMAIL_FROM_ADDRESS` | No | Local message sender; defaults to `no-reply@cuevo.local` |
| `GOOGLE_IOS_CLIENT_ID` | No | Public iOS OAuth client ID used to validate Google `azp` when present |
| `GOOGLE_SERVER_CLIENT_ID` | No | Public server OAuth client ID used as the Google ID-token audience |
| `AUTH_RATE_LIMIT_*` | No | Development/test-only per-window request maxima (1–1000); defaults match the production policy |

Example values in `.env.example` contain development-only placeholder
credentials. The application fails startup configuration if `DATABASE_URL` is
missing or is not a PostgreSQL URL. In test mode, `TEST_DATABASE_URL` is
required and must not identify the same database as `DATABASE_URL`. Validation
errors and health responses do not include database credentials.
The example `AUTH_SECRET_KEY` is a placeholder and must be replaced with a
fresh local value. `ENVIRONMENT=production` is intentionally rejected until a
production email delivery adapter is approved; the current SMTP adapter is for
local Mailpit only.

## PostgreSQL without Docker

Create separate development and test databases and users locally, then set
matching `DATABASE_URL` and `TEST_DATABASE_URL` values in `backend/.env`:

```sql
CREATE DATABASE cuevo_dev;
CREATE DATABASE cuevo_test;
```

Keep the test database separate and do not run application migrations or tests
against production data.

## Health and readiness

`GET /health` reports the API process and database readiness without exposing
configuration:

```json
{
  "status": "ok",
  "api": "ready",
  "database": "ready"
}
```

It returns HTTP `200` when the database responds to `SELECT 1`. It returns HTTP
`503` with `database: "unavailable"` if PostgreSQL cannot be reached.

## Migrations

Create migrations only after a domain model is introduced:

```bash
alembic revision --autogenerate -m "describe the schema change"
alembic upgrade head
alembic downgrade -1
```

The initial `0001_initial` migration establishes migration metadata only;
`0002_account_auth` adds the email/password account/authentication tables and
`0003_google_identity` adds provider identity mappings and allows passwordless
Google accounts. `0004_profiles_friendships` adds profile data and the
deterministic friendship-request model without duplicating F02 account or
session tables. `0005_profile_avatars` adds bounded PostgreSQL avatar storage.
The `0004` downgrade drops profile and friendship data; the `0005` downgrade
drops only avatar data. Only test downgrades against an isolated disposable
database. To apply the migrations to the isolated test database, set
`DATABASE_URL` to `cuevo_dev`, `TEST_DATABASE_URL` to `cuevo_test`, and run
`ENVIRONMENT=test alembic upgrade head`. `0006_song_catalog` adds empty song,
genre, and provider-record tables; it does not seed metadata.
`0007_notifications` adds durable recipient-scoped notification records and
idempotency keys; it creates no sample notifications.

## Tests

Run the unit and API tests from this directory:

```bash
python -m pytest
```

The test configuration forcibly selects the isolated `cuevo_test` database;
the auth integration tests use real PostgreSQL transactions and constraints,
never a development or production database. Test mode rejects a missing test
URL or one that resolves to the same host, port and database as the primary
URL. Tests inject an in-memory email adapter; they do not send mail or log
active challenge codes.

See the [auth lifecycle guide](docs/auth-lifecycle.md) for local Mailpit,
migration, request examples, and rate-limit policy. See
[profile/friendship contract](docs/profile-and-friendship.md) for profile
limits/privacy, friendship transitions, and disposable integration-test
accounts. See [local demo accounts](docs/development-demo.md) for persistent,
guarded development-only seed instructions and credentials. See
[foundation verification](docs/foundation-verification.md) for database
isolation and environment verification. The moved
[backend handoff](docs/BACKEND_TEAMMATE_HANDOFF.md) and
[frontend handoff](docs/FRONTEND_TEAMMATE_HANDOFF.md) retain project context;
the [original project request](docs/message.txt) records the initial
requirements. [Song catalog documentation](data/SONG_CATALOG.md) records the
approved static metadata source, field mapping, import commands, stable IDs,
and search contract. Apple metadata records do not provide playable audio or
an artwork license.

The current 125-test backend suite passed on Python 3.13.1 against isolated
PostgreSQL 16. Migration `0006_song_catalog` was applied from an empty
database, and Alembic reported no model/schema drift. Python 3.12 remains the
documented baseline; the handoff reports dependency-installation failure on
Python 3.14, which remains unverified. See
[foundation verification](docs/foundation-verification.md) for the recorded
environment checks.
