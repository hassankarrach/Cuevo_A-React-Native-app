# Cuevo backend

Cuevo is the repository name for the project specified as **Music Room** in the
project subject. The backend is the authoritative service-data layer for the
React Native/Expo frontend.

## Requirements

- Python 3.11 or newer
- Docker with Docker Compose (recommended for PostgreSQL)
- PostgreSQL 16 if running PostgreSQL directly instead of Docker

## Linux/macOS setup

From the repository root:

```bash
cd backend
python3 -m venv .venv
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
databases. The passwords and accounts are development-only placeholders.
Do not use them outside local development or commit a real `.env` file.

Initialize and upgrade the database:

```bash
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

OpenAPI is available at `http://127.0.0.1:8000/docs`.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL URL for the selected development or production environment |
| `TEST_DATABASE_URL` | Test setup | PostgreSQL URL for isolated test database operations |
| `ENVIRONMENT` | No | `development`, `test`, or `production`; defaults to `development` |

Example values in `.env.example` contain no real credentials. The application
fails startup configuration if `DATABASE_URL` is missing or is not a PostgreSQL
URL. Database passwords and provider secrets are never included in health
responses or API startup logs.

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
does not invent domain tables.

## Tests

Run the isolated unit and API tests:

```bash
python -m pytest
```

Tests do not use or modify a real development database; test settings point to
`cuevo_test`. To verify PostgreSQL and migrations with Docker:

```bash
ENVIRONMENT=test \
DATABASE_URL=postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test \
TEST_DATABASE_URL=postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test \
alembic upgrade head
```