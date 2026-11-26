from ipaddress import ip_address
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


BACKEND_DIR = Path(__file__).resolve().parents[2]

AUTH_RATE_LIMIT_FIELDS = {
    "register-ip-hour": "auth_rate_limit_register_ip_hour",
    "login-email-15m": "auth_rate_limit_login_email_15m",
    "login-ip-15m": "auth_rate_limit_login_ip_15m",
    "verify-email-15m": "auth_rate_limit_verify_email_15m",
    "verify-ip-15m": "auth_rate_limit_verify_ip_15m",
    "resend-email-30s": "auth_rate_limit_resend_email_30s",
    "resend-email-hour": "auth_rate_limit_resend_email_hour",
    "refresh-token-15m": "auth_rate_limit_refresh_token_15m",
    "refresh-ip-15m": "auth_rate_limit_refresh_ip_15m",
    "reset-request-email-30s": "auth_rate_limit_reset_request_email_30s",
    "reset-request-email-hour": "auth_rate_limit_reset_request_email_hour",
    "reset-request-ip-hour": "auth_rate_limit_reset_request_ip_hour",
    "reset-confirm-email-hour": "auth_rate_limit_reset_confirm_email_hour",
    "reset-confirm-ip-hour": "auth_rate_limit_reset_confirm_ip_hour",
    "password-change-account-15m": "auth_rate_limit_password_change_account_15m",
    "password-change-ip-15m": "auth_rate_limit_password_change_ip_15m",
    "google-signin-ip-15m": "auth_rate_limit_google_signin_ip_15m",
    "google-link-account-15m": "auth_rate_limit_google_link_account_15m",
    "google-link-ip-15m": "auth_rate_limit_google_link_ip_15m",
    "google-unlink-account-15m": "auth_rate_limit_google_unlink_account_15m",
    "google-unlink-ip-15m": "auth_rate_limit_google_unlink_ip_15m",
}


class Settings(BaseSettings):
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(min_length=1)
    test_database_url: str | None = None
    auth_secret_key: SecretStr = Field(min_length=32)
    email_smtp_host: str = "127.0.0.1"
    email_smtp_port: int = Field(default=1025, ge=1, le=65535)
    email_from_address: str = "no-reply@cuevo.local"
    google_ios_client_id: str | None = None
    google_server_client_id: str | None = None
    auth_rate_limit_register_ip_hour: int = Field(default=5, ge=1, le=1000)
    auth_rate_limit_login_email_15m: int = Field(default=5, ge=1, le=1000)
    auth_rate_limit_login_ip_15m: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_verify_email_15m: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_verify_ip_15m: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_resend_email_30s: int = Field(default=1, ge=1, le=1000)
    auth_rate_limit_resend_email_hour: int = Field(default=5, ge=1, le=1000)
    auth_rate_limit_refresh_token_15m: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_refresh_ip_15m: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_reset_request_email_30s: int = Field(default=1, ge=1, le=1000)
    auth_rate_limit_reset_request_email_hour: int = Field(default=3, ge=1, le=1000)
    auth_rate_limit_reset_request_ip_hour: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_reset_confirm_email_hour: int = Field(default=5, ge=1, le=1000)
    auth_rate_limit_reset_confirm_ip_hour: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_password_change_account_15m: int = Field(
        default=5, ge=1, le=1000
    )
    auth_rate_limit_password_change_ip_15m: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_google_signin_ip_15m: int = Field(default=20, ge=1, le=1000)
    auth_rate_limit_google_link_account_15m: int = Field(default=5, ge=1, le=1000)
    auth_rate_limit_google_link_ip_15m: int = Field(default=10, ge=1, le=1000)
    auth_rate_limit_google_unlink_account_15m: int = Field(default=5, ge=1, le=1000)
    auth_rate_limit_google_unlink_ip_15m: int = Field(default=10, ge=1, le=1000)

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        hide_input_in_errors=True,
    )

    @field_validator("database_url", "test_database_url")
    @classmethod
    def validate_database_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        if not value:
            raise ValueError("DATABASE_URL and TEST_DATABASE_URL must be PostgreSQL URLs")
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL and TEST_DATABASE_URL must be PostgreSQL URLs")
        return value

    @field_validator("email_smtp_host")
    @classmethod
    def require_local_email_smtp(cls, value: str) -> str:
        if value.lower() == "localhost":
            return value
        try:
            address = ip_address(value)
        except ValueError as exc:
            raise ValueError("EMAIL_SMTP_HOST must be a loopback address") from exc
        if not address.is_loopback:
            raise ValueError("EMAIL_SMTP_HOST must be a loopback address")
        return value

    @field_validator("google_ios_client_id", "google_server_client_id")
    @classmethod
    def normalize_optional_google_client_id(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def require_isolated_test_database(self) -> "Settings":
        if self.environment == "production":
            changed_limits = [
                name
                for name, field_name in AUTH_RATE_LIMIT_FIELDS.items()
                if getattr(self, field_name)
                != type(self).model_fields[field_name].default
            ]
            if changed_limits:
                raise ValueError(
                    "Authentication rate limits cannot be overridden in production"
                )
            raise ValueError(
                "Production email delivery is not configured; approve a delivery adapter"
            )
        if self.environment != "test":
            return self
        if self.test_database_url is None:
            raise ValueError("TEST_DATABASE_URL is required when ENVIRONMENT=test")

        application_url = make_url(self.database_url)
        test_url = make_url(self.test_database_url)
        application_target = (
            (application_url.host or "").lower(),
            application_url.port or 5432,
            application_url.database,
        )
        test_target = (
            (test_url.host or "").lower(),
            test_url.port or 5432,
            test_url.database,
        )
        if application_target == test_target:
            raise ValueError("TEST_DATABASE_URL must target a separate database")
        return self

    def auth_rate_limit(self, name: str) -> int:
        try:
            field_name = AUTH_RATE_LIMIT_FIELDS[name]
        except KeyError as exc:
            raise ValueError(f"Unknown authentication rate limit: {name}") from exc
        return getattr(self, field_name)


def get_settings() -> Settings:
    return Settings()
