from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.session import get_db_engine
from app.main import create_app


class ReadyConnection:
    def __enter__(self) -> "ReadyConnection":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, *_args: object) -> None:
        return None


class ReadyEngine:
    def connect(self) -> ReadyConnection:
        return ReadyConnection()


class UnavailableEngine:
    def connect(self) -> ReadyConnection:
        raise ConnectionError("database unavailable")


def test_app_starts_and_health_is_ready() -> None:
    settings = Settings(
        environment="test",
        database_url="postgresql+psycopg://cuevo:local@localhost:5432/cuevo_test",
        test_database_url="postgresql+psycopg://cuevo:local@localhost:5432/cuevo_test",
        _env_file=None,
    )
    app = create_app(settings)
    app.dependency_overrides[get_db_engine] = lambda: ReadyEngine()

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "api": "ready",
        "database": "ready",
    }


def test_health_returns_503_when_database_is_unavailable() -> None:
    app = create_app(
        Settings(
            environment="test",
            database_url="postgresql+psycopg://cuevo:local@localhost:5432/cuevo_test",
            _env_file=None,
        )
    )
    app.dependency_overrides[get_db_engine] = lambda: UnavailableEngine()

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"
