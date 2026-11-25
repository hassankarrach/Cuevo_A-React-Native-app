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

Start the local development database:

```bash
docker compose up -d postgres
docker compose ps
```

The Compose setup creates local `cuevo_dev` and isolated `cuevo_test`
databases and publishes PostgreSQL only on localhost. The passwords and
accounts are development-only placeholders.
Do not use them outside local development or commit a real `.env` file.

Initialize and upgrade the development database:

```bash
alembic upgrade head
```

For a fresh, isolated PostgreSQL instance and test database, use a dedicated
Compose project name. Its volume is separate from the normal development
database:

```bash
docker compose -p cuevo-foundation up -d postgres
docker compose -p cuevo-foundation exec -T postgres pg_isready -U cuevo -d cuevo_test
ENVIRONMENT=test alembic upgrade head
```

In test mode, `TEST_DATABASE_URL` is mandatory and must target a different
database from `DATABASE_URL`. Alembic and the application use only the test URL
in that mode; a missing or identical target fails configuration instead of
falling back to the development database. The test suite also overwrites
inherited database environment variables with local test-only values.

Start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

OpenAPI is available at `http://127.0.0.1:8000/docs`.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL URL for the selected development or production environment |
| `TEST_DATABASE_URL` | Test mode | Isolated PostgreSQL URL required when `ENVIRONMENT=test` |
| `ENVIRONMENT` | No | `development`, `test`, or `production`; defaults to `development` |

Example values in `.env.example` contain development-only placeholder
credentials. The application fails startup configuration if `DATABASE_URL` is
missing or is not a PostgreSQL URL. In test mode, `TEST_DATABASE_URL` is
required and must not identify the same database as `DATABASE_URL`. Validation
errors and health responses do not include database credentials.

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

The initial `0001_initial` migration establishes migration metadata only and
does not invent domain tables. To apply it to the isolated test database, set
`DATABASE_URL` to `cuevo_dev`, `TEST_DATABASE_URL` to `cuevo_test`, and run
`ENVIRONMENT=test alembic upgrade head`.

## Tests

Run the unit and API tests from this directory:

```bash
python -m pytest
```

Tests do not connect to a real development or production database; the test
configuration forcibly selects `cuevo_test`. Test mode rejects a missing test
URL or one that resolves to the same host, port and database as the primary
URL.

The handoff reports successful dependency installation and six tests on Python
3.12, and a dependency-install failure on Python 3.14. Python 3.13 has not been
verified; use Python 3.12 for a reproducible setup. See
[foundation verification](docs/foundation-verification.md) for the recorded
environment checks.
