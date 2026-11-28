from dataclasses import dataclass
from ipaddress import ip_address
from uuid import UUID, uuid5

from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.auth.models import Account
from app.auth.security import hash_password, utc_now
from app.catalog.importer import seed_demo_catalog
from app.catalog.models import Song
from app.core.config import Settings, get_settings
from app.profiles.models import Profile
from app.playlists.models import (
    Playlist,
    PlaylistEntry,
    PlaylistEvent,
    PlaylistInvitation,
)
from app.rooms.models import Room, RoomEvent, RoomInvitation, RoomMembership


_PLAYLIST_SEED_NAMESPACE = UUID("2fac67f0-98a7-4a60-96c8-0ef89daf817c")
_DEMO_PLAYLIST_MARKER = "cuevo-demo-playlist-v1"
_DEMO_PLAYLIST_SONG_IDS = (
    UUID("e9466fa3-3e0a-5f93-8d4a-1ff70a27904d"),
    UUID("178d6686-3f93-5b74-8bab-a02641ce11e1"),
    UUID("ffcc2828-adba-5db4-803e-42b3b75a8e47"),
)
_ROOM_SEED_NAMESPACE = UUID("a519bc53-6aa7-4e02-b18b-8b00854e888e")
_DEMO_ROOM_FIXTURES = (
    {
        "key": "public-room",
        "marker": "cuevo-demo-room-public-v1",
        "host_email": "alex.demo@example.com",
        "name": "Cuevo Demo Public Room",
        "description": "A public room for local room discovery and joining.",
        "visibility": "public",
        "invite_email": None,
    },
    {
        "key": "private-room",
        "marker": "cuevo-demo-room-private-v1",
        "host_email": "jamie.demo@example.com",
        "name": "Cuevo Demo Private Room",
        "description": "A private room shared with the invited demo account.",
        "visibility": "private",
        "invite_email": "alex.demo@example.com",
    },
)


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


@dataclass(frozen=True)
class PlaylistSeedResult:
    created: bool
    skipped: bool


@dataclass(frozen=True)
class RoomSeedResult:
    created: int
    skipped: int


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


def seed_demo_playlist(db: Session) -> PlaylistSeedResult:
    if db.in_transaction():
        raise RuntimeError(
            "Demo playlist seeding requires a session with no active transaction."
        )

    playlist_id = uuid5(_PLAYLIST_SEED_NAMESPACE, "playlist")
    operation_id = uuid5(_PLAYLIST_SEED_NAMESPACE, "create-operation")
    try:
        with db.begin():
            alex_email, jamie_email = (demo.email for demo in DEMO_ACCOUNTS)
            alex = db.scalar(select(Account).where(Account.email == alex_email))
            jamie = db.scalar(select(Account).where(Account.email == jamie_email))
            if alex is None or jamie is None:
                raise RuntimeError(
                    "Demo accounts must be seeded before the demo playlist."
                )
            existing = db.scalar(
                select(Playlist)
                .where(
                    (Playlist.seed_marker == _DEMO_PLAYLIST_MARKER)
                    | (Playlist.id == playlist_id)
                )
                .with_for_update()
            )
            if existing is not None:
                return PlaylistSeedResult(created=False, skipped=True)
            catalog_ids = set(db.scalars(select(Song.id)).all())
            if not set(_DEMO_PLAYLIST_SONG_IDS).issubset(catalog_ids):
                raise RuntimeError(
                    "Approved demo catalog songs must be seeded before playlists."
                )
            playlist = Playlist(
                id=playlist_id,
                owner_account_id=alex.id,
                name="Cuevo Demo Mix",
                description="A shared playlist using approved catalog tracks.",
                visibility="public",
                edit_policy="everyone",
                revision=1,
                creation_operation_id=operation_id,
                creation_fingerprint="seed-owned-v1",
                seed_marker=_DEMO_PLAYLIST_MARKER,
            )
            db.add(playlist)
            db.flush()
            invitation = PlaylistInvitation(
                id=uuid5(_PLAYLIST_SEED_NAMESPACE, "jamie-invitation"),
                playlist_id=playlist.id,
                invitee_account_id=jamie.id,
                inviter_account_id=alex.id,
                status="accepted",
            )
            entries = [
                PlaylistEntry(
                    id=uuid5(_PLAYLIST_SEED_NAMESPACE, f"entry-{position}"),
                    playlist_id=playlist.id,
                    song_id=song_id,
                    added_by_account_id=alex.id if position == 0 else jamie.id,
                    position=position,
                )
                for position, song_id in enumerate(_DEMO_PLAYLIST_SONG_IDS)
            ]
            db.add_all(
                [
                    invitation,
                    *entries,
                    PlaylistEvent(
                        id=uuid5(_PLAYLIST_SEED_NAMESPACE, "created-event"),
                        playlist_id=playlist.id,
                        revision=1,
                        event_type="playlist.created",
                        operation_id=operation_id,
                        payload={},
                    ),
                ]
            )
            db.flush()
    except IntegrityError:
        db.rollback()
        raise
    return PlaylistSeedResult(created=True, skipped=False)


def seed_demo_rooms(db: Session) -> RoomSeedResult:
    if db.in_transaction():
        raise RuntimeError("Demo room seeding requires a session with no active transaction.")

    created = 0
    skipped = 0
    try:
        with db.begin():
            accounts = {
                account.email: account
                for account in db.scalars(
                    select(Account).where(
                        Account.email.in_(
                            demo.email for demo in DEMO_ACCOUNTS
                        )
                    )
                ).all()
            }
            if len(accounts) != len(DEMO_ACCOUNTS):
                raise RuntimeError(
                    "Demo accounts must be seeded before the demo rooms."
                )
            for fixture in _DEMO_ROOM_FIXTURES:
                room_id = uuid5(_ROOM_SEED_NAMESPACE, fixture["key"])
                existing = db.scalar(
                    select(Room)
                    .where(
                        (Room.seed_marker == fixture["marker"])
                        | (Room.id == room_id)
                    )
                    .with_for_update()
                )
                if existing is not None:
                    skipped += 1
                    continue
                host = accounts[fixture["host_email"]]
                room = Room(
                    id=room_id,
                    host_account_id=host.id,
                    name=fixture["name"],
                    description=fixture["description"],
                    visibility=fixture["visibility"],
                    vote_eligibility="everyone",
                    status="active",
                    revision=1,
                    creation_operation_id=uuid5(
                        _ROOM_SEED_NAMESPACE, f"{fixture['key']}-create"
                    ),
                    creation_fingerprint="seed-owned-v1",
                    seed_marker=fixture["marker"],
                )
                db.add(room)
                db.flush()
                db.add(
                    RoomMembership(
                        id=uuid5(_ROOM_SEED_NAMESPACE, f"{fixture['key']}-host"),
                        room_id=room.id,
                        account_id=host.id,
                        role="host",
                    )
                )
                event_id = uuid5(
                    _ROOM_SEED_NAMESPACE, f"{fixture['key']}-created-event"
                )
                db.add(
                    RoomEvent(
                        id=event_id,
                        room_id=room.id,
                        revision=1,
                        event_type="room.created",
                        actor_account_id=host.id,
                        operation_id=room.creation_operation_id,
                        payload={},
                    )
                )
                invite_email = fixture["invite_email"]
                if invite_email is not None:
                    invitee = accounts[invite_email]
                    db.add(
                        RoomInvitation(
                            id=uuid5(
                                _ROOM_SEED_NAMESPACE,
                                f"{fixture['key']}-invitation",
                            ),
                            room_id=room.id,
                            invitee_account_id=invitee.id,
                            inviter_account_id=host.id,
                            status="accepted",
                        )
                    )
                db.flush()
                created += 1
    except IntegrityError:
        db.rollback()
        raise
    return RoomSeedResult(created=created, skipped=skipped)


def main() -> None:
    settings = get_settings()
    validate_seed_target(settings)
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    try:
        with session_factory() as db:
            result = seed_demo_accounts(db)
            catalog_result = seed_demo_catalog(db)
        with session_factory() as db:
            playlist_result = seed_demo_playlist(db)
        with session_factory() as db:
            room_result = seed_demo_rooms(db)
    finally:
        engine.dispose()

    print(
        f"Created {len(result.created_emails)} demo account(s); "
        f"skipped {len(result.skipped_emails)} reserved email(s); "
        f"created {len(catalog_result.created_ids)} demo song(s); "
        f"skipped {len(catalog_result.skipped_ids)} existing song(s); "
        f"{'created' if playlist_result.created else 'skipped'} demo playlist; "
        f"created {room_result.created} demo room(s); "
        f"skipped {room_result.skipped} existing demo room(s)."
    )


if __name__ == "__main__":
    main()
