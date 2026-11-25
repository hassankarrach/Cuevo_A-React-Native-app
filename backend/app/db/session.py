from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.errors import APIError
from app.core.config import Settings, get_settings


def create_db_engine(settings: Settings) -> Engine:
    url = settings.database_url
    if settings.environment == "test":
        if settings.test_database_url is None:
            raise ValueError("TEST_DATABASE_URL is required when ENVIRONMENT=test")
        url = settings.test_database_url
    return create_engine(url, pool_pre_ping=True)


settings = get_settings()
engine = create_db_engine(settings)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db_engine() -> Engine:
    return engine


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        try:
            yield session
        except APIError:
            session.commit()
            raise
        except Exception:
            session.rollback()
            raise
        else:
            session.commit()
