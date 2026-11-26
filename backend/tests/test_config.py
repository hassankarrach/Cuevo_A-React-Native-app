import pytest
from pydantic import ValidationError

from app.core.config import AUTH_RATE_LIMIT_FIELDS, Settings
from app.db.session import create_db_engine


AUTH_SECRET_KEY = "test-only-auth-secret-key-not-for-production"


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
            auth_secret_key=AUTH_SECRET_KEY,
            _env_file=None,
        )


def test_test_database_must_be_separate() -> None:
    with pytest.raises(ValidationError, match="must target a separate database"):
        Settings(
            environment="test",
            database_url=TEST_DATABASE_URL,
            test_database_url=TEST_DATABASE_URL,
            auth_secret_key=AUTH_SECRET_KEY,
            _env_file=None,
        )


def test_development_and_test_databases_are_separate() -> None:
    settings = Settings(
        environment="development",
        database_url=DEVELOPMENT_DATABASE_URL,
        test_database_url=TEST_DATABASE_URL,
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    dev_engine = create_db_engine(settings)

    test_settings = settings.model_copy(update={"environment": "test"})
    test_engine = create_db_engine(test_settings)

    assert dev_engine.url.database == "cuevo_dev"
    assert test_engine.url.database == "cuevo_test"
    dev_engine.dispose()
    test_engine.dispose()


def test_google_client_ids_are_optional_and_trimmed() -> None:
    settings = Settings(
        database_url=DEVELOPMENT_DATABASE_URL,
        auth_secret_key=AUTH_SECRET_KEY,
        google_ios_client_id=" ios-client ",
        google_server_client_id="   ",
        _env_file=None,
    )

    assert settings.google_ios_client_id == "ios-client"
    assert settings.google_server_client_id is None


def test_postgres_url_is_normalized() -> None:
    settings = Settings(
        auth_secret_key=AUTH_SECRET_KEY,
        database_url="postgresql://cuevo:cuevo_dev_password@localhost:5432/cuevo_dev",
        _env_file=None,
    )
    assert str(settings.database_url).startswith("postgresql+psycopg://")


def test_invalid_database_url_does_not_expose_credentials() -> None:
    secret = "sensitive-test-password"
    with pytest.raises(ValidationError) as error:
        Settings(
            auth_secret_key=AUTH_SECRET_KEY,
            database_url=f"mysql://user:{secret}@localhost/cuevo",
            _env_file=None,
        )
    assert secret not in str(error.value)


def test_email_delivery_host_must_be_local() -> None:
    with pytest.raises(ValidationError, match="loopback address"):
        Settings(
            database_url=DEVELOPMENT_DATABASE_URL,
            auth_secret_key=AUTH_SECRET_KEY,
            email_smtp_host="smtp.example.com",
            _env_file=None,
        )


def test_production_settings_require_an_approved_email_adapter() -> None:
    with pytest.raises(ValidationError, match="Production email delivery is not configured"):
        Settings(
            environment="production",
            database_url=DEVELOPMENT_DATABASE_URL,
            auth_secret_key=AUTH_SECRET_KEY,
            _env_file=None,
        )


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("register-ip-hour", 5),
        ("login-email-15m", 5),
        ("login-ip-15m", 10),
        ("verify-email-15m", 10),
        ("verify-ip-15m", 10),
        ("resend-email-30s", 1),
        ("resend-email-hour", 5),
        ("refresh-token-15m", 10),
        ("refresh-ip-15m", 10),
        ("reset-request-email-30s", 1),
        ("reset-request-email-hour", 3),
        ("reset-request-ip-hour", 10),
        ("reset-confirm-email-hour", 5),
        ("reset-confirm-ip-hour", 10),
        ("password-change-account-15m", 5),
        ("password-change-ip-15m", 10),
        ("google-signin-ip-15m", 20),
        ("google-link-account-15m", 5),
        ("google-link-ip-15m", 10),
        ("google-unlink-account-15m", 5),
        ("google-unlink-ip-15m", 10),
    ],
)
def test_auth_rate_limits_default_to_fixed_policy(name: str, expected: int) -> None:
    settings = Settings(
        database_url=DEVELOPMENT_DATABASE_URL,
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    assert settings.auth_rate_limit(name) == expected


@pytest.mark.parametrize("environment", ["development", "test"])
def test_auth_rate_limit_overrides_are_supported(
    environment: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AUTH_RATE_LIMIT_LOGIN_EMAIL_15M", "125")
    settings = Settings(
        environment=environment,
        database_url=DEVELOPMENT_DATABASE_URL,
        test_database_url=TEST_DATABASE_URL if environment == "test" else None,
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    assert settings.auth_rate_limit("login-email-15m") == 125


@pytest.mark.parametrize("value", [0, -1, 1001, 1.5, float("inf"), float("nan")])
def test_auth_rate_limit_rejects_nonpositive_fractional_or_unbounded_values(
    value: int | float,
) -> None:
    with pytest.raises(ValidationError):
        Settings(
            database_url=DEVELOPMENT_DATABASE_URL,
            auth_secret_key=AUTH_SECRET_KEY,
            auth_rate_limit_login_email_15m=value,
            _env_file=None,
        )


def test_production_auth_rate_limit_override_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AUTH_RATE_LIMIT_LOGIN_EMAIL_15M", "100")
    with pytest.raises(
        ValidationError,
        match="Authentication rate limits cannot be overridden in production",
    ):
        Settings(
            environment="production",
            database_url=DEVELOPMENT_DATABASE_URL,
            auth_secret_key=AUTH_SECRET_KEY,
            _env_file=None,
        )


def test_auth_rate_limit_names_are_complete_and_known() -> None:
    settings = Settings(
        database_url=DEVELOPMENT_DATABASE_URL,
        auth_secret_key=AUTH_SECRET_KEY,
        _env_file=None,
    )
    assert len(AUTH_RATE_LIMIT_FIELDS) == 21
    with pytest.raises(ValueError, match="Unknown authentication rate limit"):
        settings.auth_rate_limit("unknown")
