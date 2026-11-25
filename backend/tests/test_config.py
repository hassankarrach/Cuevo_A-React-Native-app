import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.db.session import create_db_engine


DEVELOPMENT_DATABASE_URL = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_dev"
)
TEST_DATABASE_URL = (
    "postgresql+psycopg://cuevo:cuevo_dev_password@localhost:5432/cuevo_test"
)


def test_missing_database_url_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_test_environment_requires_test_database_url() -> None:
    with pytest.raises(ValidationError, match="TEST_DATABASE_URL is required"):
        Settings(
            environment="test",
            database_url=DEVELOPMENT_DATABASE_URL,
            test_database_url=None,
            _env_file=None,
        )


def test_test_database_must_be_separate() -> None:
    with pytest.raises(ValidationError, match="must target a separate database"):
        Settings(
            environment="test",
            database_url=TEST_DATABASE_URL,
            test_database_url=TEST_DATABASE_URL,
            _env_file=None,
        )


def test_development_and_test_databases_are_separate() -> None:
    settings = Settings(
        environment="development",
        database_url=DEVELOPMENT_DATABASE_URL,
        test_database_url=TEST_DATABASE_URL,
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
        database_url="postgresql://cuevo:cuevo_dev_password@localhost:5432/cuevo_dev",
        _env_file=None,
    )
    assert str(settings.database_url).startswith("postgresql+psycopg://")


def test_invalid_database_url_does_not_expose_credentials() -> None:
    secret = "sensitive-test-password"
    with pytest.raises(ValidationError) as error:
        Settings(
            database_url=f"mysql://user:{secret}@localhost/cuevo",
            _env_file=None,
        )
    assert secret not in str(error.value)
