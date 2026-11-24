import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.db.session import create_db_engine


def test_missing_database_url_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_development_and_test_databases_are_separate() -> None:
    settings = Settings(
        environment="development",
        database_url="postgresql+psycopg://cuevo:local@localhost:5432/cuevo_dev",
        test_database_url="postgresql+psycopg://cuevo:local@localhost:5432/cuevo_test",
        _env_file=None,
    )
    dev_engine = create_db_engine(settings)

    test_settings = settings.model_copy(update={"environment": "test"})
    test_engine = create_db_engine(test_settings)

    assert dev_engine.url.database == "cuevo_dev"
    assert test_engine.url.database == "cuevo_test"
    dev_engine.dispose()
    test_engine.dispose()


def test_postgres_url_is_normalized() -> None:
    settings = Settings(
        database_url="postgresql://cuevo:local@localhost:5432/cuevo_dev",
        _env_file=None,
    )
    assert str(settings.database_url).startswith("postgresql+psycopg://")
