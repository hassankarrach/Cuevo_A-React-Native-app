from dataclasses import dataclass
from ipaddress import ip_address

from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.auth.models import Account
from app.auth.security import hash_password, utc_now
from app.core.config import Settings, get_settings
from app.profiles.models import Profile


@dataclass(frozen=True)
class DemoAccount:
    email: str
    password: str
    display_name: str
    username: str


DEMO_ACCOUNTS = (
    DemoAccount(
        email="alex.demo@example.com",
        password="CuevoDemo-Alex-2026!",
        display_name="Alex Demo",
        username="alex_demo",
    ),
    DemoAccount(
        email="jamie.demo@example.com",
        password="CuevoDemo-Jamie-2026!",
        display_name="Jamie Demo",
        username="jamie_demo",
    ),
)


@dataclass(frozen=True)
class SeedResult:
    created_emails: tuple[str, ...]
    skipped_emails: tuple[str, ...]


def validate_seed_target(settings: Settings) -> None:
    if settings.environment != "development":
        raise RuntimeError("Demo seeding is allowed only in development.")

    url = make_url(settings.database_url)
    if url.database != "cuevo_dev":
        raise RuntimeError("Demo seeding requires the cuevo_dev database.")

    host = (url.host or "").lower()
    try:
        is_loopback = ip_address(host).is_loopback
    except ValueError:
        is_loopback = host == "localhost"
    if not is_loopback:
        raise RuntimeError("Demo seeding requires a loopback database host.")


def seed_demo_accounts(db: Session) -> SeedResult:
    if db.in_transaction():
        raise RuntimeError("Demo seeding requires a session with no active transaction.")

    created: list[str] = []
    skipped: list[str] = []
    now = utc_now()

    try:
        with db.begin():
            for demo in DEMO_ACCOUNTS:
                existing_id = db.scalar(
                    select(Account.id)
                    .where(Account.email == demo.email)
                    .with_for_update()
                )
                if existing_id is not None:
                    skipped.append(demo.email)
                    continue

                account = Account(
                    email=demo.email,
                    password_hash=hash_password(demo.password),
                    email_verified_at=now,
                    created_at=now,
                )
                db.add(account)
                db.flush()
                db.add(
                    Profile(
                        account_id=account.id,
                        display_name=demo.display_name,
                        username=demo.username,
                    )
                )
                db.flush()
                created.append(demo.email)
    except IntegrityError:
        db.rollback()
        raise

    return SeedResult(tuple(created), tuple(skipped))


def main() -> None:
    settings = get_settings()
    validate_seed_target(settings)
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    try:
        with session_factory() as db:
            result = seed_demo_accounts(db)
    finally:
        engine.dispose()

    print(
        f"Created {len(result.created_emails)} demo account(s); "
        f"skipped {len(result.skipped_emails)} reserved email(s)."
    )


if __name__ == "__main__":
    main()
