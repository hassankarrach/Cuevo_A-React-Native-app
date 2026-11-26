# Backend foundation verification

This guide records the API/database foundation and current backend
verification. Auth behavior is documented in
[`auth-lifecycle.md`](./auth-lifecycle.md).

## Supported Python

Use Python 3.12 as the documented baseline. Before the approved avatar
addition, the complete backend suite passed on Python 3.12.16 and 3.13.18.
The latest avatar-aware suite passed on Python 3.12.16; it has not yet been
rerun on 3.13.18. Python 3.14 is not verified; the handoff reports a
dependency-installation failure there.

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

The F00–F04 foundation/auth/profile updates were verified on 2026-11-26 using
a dedicated `cuevo-gap-check` PostgreSQL 16 Compose project on localhost port
55432. Both the focused auth/config/seed/profile integration set and the full
suite ran with the test harness pinned to `127.0.0.1:55432/cuevo_test`; it
overwrites inherited database and rate-limit settings so the integration
fixtures cannot target development or production databases.

```text
Python 3.12.16: 99 passed, 1 warning in 10.60s
Python 3.13.18 focused: 71 passed, 1 warning in 8.69s
Python 3.13.18 full suite: 99 passed, 1 warning in 10.30s
```

The warning is Starlette's existing deprecation notice for the
`anyio.abc.BlockingPortal` alias. On a freshly recreated `cuevo_test` database,
`ENVIRONMENT=test alembic upgrade head` applied revisions `0001_initial`,
`0002_account_auth`, `0003_google_identity`, and `0004_profiles_friendships`;
the database reported `0004_profiles_friendships`. After explicit approval of
the durable PostgreSQL avatar contract, migration `0005_profile_avatars` adds
the bounded avatar table without adding avatar bytes or columns to `profiles`.

## Approved avatar contract and final verification

The owner approved PostgreSQL-backed image bytes, a 2 MiB maximum, JPEG/PNG/WebP
validation, and reads governed by the profile's existing privacy state. On
2026-11-26, a new PostgreSQL 16 Compose project and volume
(`cuevo-avatar-migration`) were used for the fresh migration check. A separate
fresh project (`cuevo-avatar-check`) was used for the pytest run. Both projects
publish only to localhost; tests use only `127.0.0.1:55432/cuevo_test` and the
test harness overwrites inherited database URLs.

The migration command was run in a Python 3.12.16 container with
`DATABASE_URL` set to `cuevo_dev`, `TEST_DATABASE_URL` set to the isolated
`cuevo_test`, and `ENVIRONMENT=test`:

```text
POSTGRES_HOST_PORT=55433 docker compose -p cuevo-avatar-migration -f backend/docker-compose.yml up -d --wait postgres
docker run --rm --network host -v /home/asadiqui/cuevo/backend:/app -w /app -e ENVIRONMENT=test -e DATABASE_URL=postgresql+psycopg://cuevo:cuevo_dev_password@127.0.0.1:55433/cuevo_dev -e TEST_DATABASE_URL=postgresql+psycopg://cuevo:cuevo_dev_password@127.0.0.1:55433/cuevo_test -e AUTH_SECRET_KEY=local-test-only-not-a-real-secret-value-32chars python:3.12-slim sh -lc 'python -m pip install -q -r requirements-dev.txt && python -m alembic upgrade head && python -m alembic current && python -m alembic check'
```

The fresh database reported:

```text
Running upgrade 0004_profiles_friendships -> 0005_profile_avatars
0005_profile_avatars (head)
No new upgrade operations detected.
```

The avatar-aware focused and full suites ran in the Python 3.12.16 container:

```text
POSTGRES_HOST_PORT=55432 docker compose -p cuevo-avatar-check -f backend/docker-compose.yml up -d --wait postgres
docker run --rm --network host -v /home/asadiqui/cuevo/backend:/app -w /app -e ENVIRONMENT=test -e DATABASE_URL=postgresql+psycopg://cuevo:cuevo_dev_password@127.0.0.1:55432/cuevo_dev -e TEST_DATABASE_URL=postgresql+psycopg://cuevo:cuevo_dev_password@127.0.0.1:55432/cuevo_test -e AUTH_SECRET_KEY=local-test-only-not-a-real-secret-value-32chars -e CUEVO_TEST_DATABASE_PORT=55432 python:3.12-slim sh -lc 'python -m pip install -q -r requirements-dev.txt && python -m pytest tests/test_profiles_integration.py tests/test_api_errors.py -q && python -m pytest -q'
```

```text
tests/test_profiles_integration.py tests/test_api_errors.py -q
22 passed, 1 warning in 8.81s
python -m pytest -q
108 passed, 1 warning in 16.61s
```

The warning remains Starlette's `anyio.abc.BlockingPortal` deprecation. Live
`/health` requests against the fresh database and a non-listening local port
returned:

```text
ready: 200 {'status': 'ok', 'api': 'ready', 'database': 'ready'} secret_leaked= False
unavailable: 503 {'status': 'unavailable', 'api': 'ready', 'database': 'unavailable'} secret_leaked= False
```
