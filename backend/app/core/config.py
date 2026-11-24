from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(min_length=1)
    test_database_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("database_url", "test_database_url")
    @classmethod
    def validate_database_url(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value or value.startswith("postgresql://"):
            if value and value.startswith("postgresql://"):
                return value.replace("postgresql://", "postgresql+psycopg://", 1)
            raise ValueError("DATABASE_URL and TEST_DATABASE_URL must be PostgreSQL URLs")
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL and TEST_DATABASE_URL must be PostgreSQL URLs")
        if "password" in value.lower() and "placeholder" in value.lower():
            raise ValueError("Use a safe local placeholder; do not commit real credentials")
        return value

def get_settings() -> Settings:
    return Settings()
