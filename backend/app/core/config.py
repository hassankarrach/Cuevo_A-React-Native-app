from ipaddress import ip_address
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(min_length=1)
    test_database_url: str | None = None
    auth_secret_key: SecretStr = Field(min_length=32)
    email_smtp_host: str = "127.0.0.1"
    email_smtp_port: int = Field(default=1025, ge=1, le=65535)
    email_from_address: str = "no-reply@cuevo.local"

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

    @model_validator(mode="after")
    def require_isolated_test_database(self) -> "Settings":
        if self.environment == "production":
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


def get_settings() -> Settings:
    return Settings()
