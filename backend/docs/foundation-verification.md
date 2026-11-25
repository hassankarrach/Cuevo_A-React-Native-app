# Backend foundation verification

This guide covers the existing API/database foundation only. It does not add
account or product-domain tables.

## Supported Python

Use Python 3.12. The handoff reports that the pinned dependencies installed and
the six original tests passed on Python 3.12. Python 3.13 has not been verified;
the handoff reports that dependency installation failed on Python 3.14.

## Isolated database

The test environment requires `TEST_DATABASE_URL` and refuses to start if it is
missing or points to the same host, port and database as `DATABASE_URL`.
Application database sessions and Alembic migrations use only
`TEST_DATABASE_URL` when `ENVIRONMENT=test`. The test `conftest.py` overwrites
inherited database variables to ensure tests cannot select an external
development or production URL.

For a new PostgreSQL 16 instance with a fresh test database, choose an unused
Compose project name and run from `backend/` (the example uses
`cuevo-foundation`):

```bash
docker compose -p cuevo-foundation up -d postgres
docker compose -p cuevo-foundation exec -T postgres pg_isready -U cuevo -d cuevo_test
```

This uses a dedicated Compose project and volume. Configure the ignored `.env`
file with local development-only values, keeping `DATABASE_URL` on `cuevo_dev`
and `TEST_DATABASE_URL` on `cuevo_test`. Compose binds PostgreSQL to localhost
only. Apply the migration:

```bash
ENVIRONMENT=test alembic upgrade head
```

The initial migration creates no product-domain tables. It only records the
Alembic revision.

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

The current migration was applied to the fresh `cuevo_test` database using
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
