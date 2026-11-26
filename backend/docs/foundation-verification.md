# Backend foundation verification

This guide records the original API/database foundation verification and the
subsequent F02 PostgreSQL checks. Auth behavior is documented in
[`auth-lifecycle.md`](./auth-lifecycle.md).

## Supported Python

Use Python 3.12 as the documented baseline. The handoff reports that the
foundation dependencies installed and the six original tests passed on Python
3.12. The F02 backend suite additionally passed on Python 3.13.1. Python 3.14
is not verified; the handoff reports a dependency-installation failure there.

## Isolated database

The test environment requires `TEST_DATABASE_URL` and refuses to start if it is
missing or points to the same host, port and database as `DATABASE_URL`.
Application database sessions and Alembic migrations use only
`TEST_DATABASE_URL` when `ENVIRONMENT=test`. The test `conftest.py` overwrites
inherited database variables with localhost-only development/test targets.
`CUEVO_TEST_DATABASE_PORT` may select another local port; the test database
name and host remain fixed to `cuevo_test` and `127.0.0.1`.

For a new PostgreSQL 16 instance with a fresh test database, choose an unused
Compose project name and unused local port (the example uses port `55432`):

```bash
POSTGRES_HOST_PORT=55432 docker compose -p cuevo-auth-tests up -d --wait postgres
POSTGRES_HOST_PORT=55432 docker compose -p cuevo-auth-tests exec -T postgres pg_isready -U cuevo -d cuevo_test
```

This uses a dedicated Compose project and volume. Configure the ignored `.env`
file with local development-only values, keeping `DATABASE_URL` on `cuevo_dev`
and `TEST_DATABASE_URL` on `cuevo_test` at port `55432`. Compose binds
PostgreSQL to localhost only. Apply the migration:

```bash
ENVIRONMENT=test alembic upgrade head
```

Run integration tests with `CUEVO_TEST_DATABASE_PORT=55432 python -m pytest`;
the test harness fixes the host and database name to localhost and
`cuevo_test`.

The original `0001_initial` migration only records the Alembic revision.
`0002_account_auth` adds the account, challenge, session, refresh-token and
rate-limit tables.

## Tests and health

Run the unit/API suite from `backend/`:

```bash
python -m pytest
```

The unit health tests assert HTTP 200 with `database: "ready"` and HTTP 503 with
`database: "unavailable"`; their unavailable error includes a credential-like
sentinel to verify that it is not returned in the response. The verification
record below also covers live PostgreSQL connections in both states. The
endpoint returns only the fixed health payload, without connection details or
credentials.

## Verification record

Verified 2026-11-25 using the `python:3.12-slim` container (Python 3.12.16)
and a fresh `cuevo-foundation` Compose project:

```bash
docker compose -p cuevo-foundation -f backend/docker-compose.yml up -d postgres
docker compose -p cuevo-foundation -f backend/docker-compose.yml exec -T postgres pg_isready -U cuevo -d cuevo_test
```

PostgreSQL reported `/var/run/postgresql:5432 - accepting connections` and
Compose reported the service healthy. Dependencies installed with
`python -m pip install -r requirements-dev.txt`. Running `python -m pytest`
from the mounted backend directory produced:

```text
collected 9 items
9 passed, 1 warning in 0.43s
```

The warning is Starlette's existing deprecation notice for the
`anyio.abc.BlockingPortal` alias.

At the F00 stage, the original migration was applied to the fresh `cuevo_test` database using
`ENVIRONMENT=test`, with `DATABASE_URL` targeting `cuevo_dev` and
`TEST_DATABASE_URL` targeting `cuevo_test`:

```text
INFO [alembic.runtime.migration] Running upgrade  -> 0001_initial, Initial migration metadata.
```

Post-migration queries returned revision `0001_initial` and zero public tables
other than `alembic_version`. FastAPI TestClient `/health` requests used real
SQLAlchemy connections and returned:

```text
ready: 200 {'status': 'ok', 'api': 'ready', 'database': 'ready'}
unavailable: 503 {'status': 'unavailable', 'api': 'ready', 'database': 'unavailable'}
```

The unavailable check used a non-listening PostgreSQL port; neither response
contained the credentials supplied to its database URL.

F02 was verified on 2026-11-25 using Python 3.13.1 and a fresh PostgreSQL 16
Compose project on localhost port 55433. The backend test suite passed 31
tests against the isolated `cuevo_test` database, including real transaction,
uniqueness, refresh replay/concurrency, challenge and revocation tests. On a
fresh database, `ENVIRONMENT=test alembic upgrade head` applied revisions
`0001_initial` and `0002_account_auth`; `ENVIRONMENT=test alembic check`
reported `No new upgrade operations detected.` Tests injected the in-memory
email adapter and did not send or log active codes.
