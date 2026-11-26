import pytest

from app import dev_seed
from app.core.config import Settings
from app.dev_seed import DEMO_ACCOUNTS, validate_seed_target


AUTH_SECRET_KEY = "test-only-auth-secret-key-not-for-production"


@pytest.mark.parametrize(
    "database_url",
    [
        "postgresql+psycopg://user:pass@remote.example:5432/cuevo_dev",
        "postgresql+psycopg://user:pass@localhost:5432/cuevo_test",
    ],
)
def test_seed_guard_rejects_remote_or_unexpected_database(
    database_url: str,
) -> None:
    settings = Settings(
        environment="development",
        database_url=database_url,
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    with pytest.raises(RuntimeError):
        validate_seed_target(settings)


def test_seed_guard_rejects_test_environment() -> None:
    settings = Settings(
        environment="test",
        database_url="postgresql+psycopg://user:pass@localhost:5432/cuevo_dev",
        test_database_url="postgresql+psycopg://user:pass@localhost:5432/cuevo_test",
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    with pytest.raises(RuntimeError, match="only in development"):
        validate_seed_target(settings)


def test_seed_guard_rejects_production_environment() -> None:
    development_settings = Settings(
        environment="development",
        database_url="postgresql+psycopg://user:pass@localhost:5432/cuevo_dev",
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    production_settings = development_settings.model_copy(
        update={"environment": "production"}
    )
    with pytest.raises(RuntimeError, match="only in development"):
        validate_seed_target(production_settings)


def test_cli_checks_unsafe_environment_before_opening_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        environment="test",
        database_url="postgresql+psycopg://user:pass@localhost:5432/cuevo_dev",
        test_database_url="postgresql+psycopg://user:pass@localhost:5432/cuevo_test",
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    monkeypatch.setattr(dev_seed, "get_settings", lambda: settings)
    monkeypatch.setattr(
        dev_seed,
        "create_engine",
        lambda *_args, **_kwargs: pytest.fail("unsafe database was opened"),
    )
    with pytest.raises(RuntimeError, match="only in development"):
        dev_seed.main()


def test_seed_guard_accepts_only_local_development_target() -> None:
    settings = Settings(
        environment="development",
        database_url="postgresql+psycopg://user:pass@127.0.0.1:5432/cuevo_dev",
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    validate_seed_target(settings)


def test_demo_accounts_have_distinct_local_credentials() -> None:
    assert len(DEMO_ACCOUNTS) >= 2
    assert len({demo.email for demo in DEMO_ACCOUNTS}) == len(DEMO_ACCOUNTS)
    assert len({demo.password for demo in DEMO_ACCOUNTS}) == len(DEMO_ACCOUNTS)
