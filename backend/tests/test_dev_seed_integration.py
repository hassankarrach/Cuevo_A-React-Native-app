from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import Account, AuthChallenge
from app.auth.security import hash_password, verify_password
from app.catalog.importer import seed_demo_catalog
from app.playlists.models import Playlist, PlaylistEntry
from app.rooms.models import Room, RoomInvitation, RoomMembership
from app.db.base import Base
from app.db.session import get_db_engine
from app.dev_seed import (
    DEMO_ACCOUNTS,
    seed_demo_accounts,
    seed_demo_playlist,
    seed_demo_rooms,
)
from app.profiles.models import Profile


@pytest.fixture
def seed_database():
    engine = get_db_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(engine)


def test_demo_seed_is_verified_profiled_transactional_and_idempotent(
    seed_database,
) -> None:
    with Session(seed_database) as db:
        first = seed_demo_accounts(db)
        assert first.created_emails == tuple(demo.email for demo in DEMO_ACCOUNTS)
        assert first.skipped_emails == ()

        accounts = db.scalars(select(Account).order_by(Account.email)).all()
        profiles = db.scalars(select(Profile).order_by(Profile.username)).all()
        assert len(accounts) == len(profiles) == len(DEMO_ACCOUNTS)
        for demo in DEMO_ACCOUNTS:
            account = db.scalar(select(Account).where(Account.email == demo.email))
            assert account is not None
            assert account.email_verified_at is not None
            assert account.password_hash is not None
            assert verify_password(account.password_hash, demo.password)
            profile = db.get(Profile, account.id)
            assert profile is not None
            assert profile.display_name == demo.display_name
            assert profile.username == demo.username
        assert db.scalar(select(func.count()).select_from(AuthChallenge)) == 0

        alex = DEMO_ACCOUNTS[0]
        account = db.scalar(select(Account).where(Account.email == alex.email))
        assert account is not None
        account.password_hash = hash_password("edited-password-stays")
        profile = db.get(Profile, account.id)
        assert profile is not None
        profile.display_name = "User-edited demo profile"
        profile.username = "alex_custom"
        edited_hash = account.password_hash
        db.commit()

        second = seed_demo_accounts(db)
        assert second.created_emails == ()
        assert second.skipped_emails == tuple(demo.email for demo in DEMO_ACCOUNTS)
        db.refresh(account)
        db.refresh(profile)
        assert account.password_hash == edited_hash
        assert verify_password(account.password_hash, "edited-password-stays")
        assert profile.display_name == "User-edited demo profile"
        assert profile.username == "alex_custom"
        assert (
            db.scalar(select(func.count()).select_from(Account))
            == len(DEMO_ACCOUNTS)
        )
        assert (
            db.scalar(select(func.count()).select_from(Profile))
            == len(DEMO_ACCOUNTS)
        )


def test_reserved_incompatible_account_is_skipped_without_takeover(seed_database) -> None:
    demo = DEMO_ACCOUNTS[0]
    original_hash = hash_password("existing-account-password")
    with Session(seed_database) as db:
        existing = Account(email=demo.email, password_hash=original_hash)
        db.add(existing)
        db.flush()
        existing_id = existing.id
        db.commit()

        result = seed_demo_accounts(db)
        assert result.created_emails == (DEMO_ACCOUNTS[1].email,)
        assert result.skipped_emails == (demo.email,)

        unchanged = db.get(Account, existing_id)
        assert unchanged is not None
        assert unchanged.email_verified_at is None
        assert unchanged.password_hash == original_hash
        assert db.get(Profile, existing_id) is None
        assert db.scalar(select(func.count()).select_from(Account)) == 2


def test_seed_rolls_back_all_new_records_on_profile_conflict(seed_database) -> None:
    with Session(seed_database) as db:
        existing = Account(email="unrelated@example.com")
        db.add(existing)
        db.flush()
        db.add(
            Profile(
                account_id=existing.id,
                display_name="Existing User",
                username=DEMO_ACCOUNTS[0].username,
            )
        )
        db.commit()

        with pytest.raises(IntegrityError):
            seed_demo_accounts(db)

        assert db.scalar(
            select(func.count())
            .select_from(Account)
            .where(Account.email.in_([demo.email for demo in DEMO_ACCOUNTS]))
        ) == 0
        assert db.scalar(select(func.count()).select_from(Account)) == 1


def test_demo_playlist_seed_is_additive_and_preserves_user_edits(seed_database) -> None:
    with Session(seed_database) as db:
        seed_demo_accounts(db)
        seed_demo_catalog(db)
    with Session(seed_database) as db:
        first = seed_demo_playlist(db)
        assert first.created is True
        assert first.skipped is False
    with Session(seed_database) as db:
        playlist = db.scalar(select(Playlist))
        assert playlist is not None
        playlist_id = playlist.id
        entry = db.scalar(
            select(PlaylistEntry)
            .where(PlaylistEntry.playlist_id == playlist_id)
            .order_by(PlaylistEntry.position)
        )
        assert entry is not None
        entry_id = entry.id
        playlist.name = "User-edited demo playlist"
        entry.position = 20
        unrelated = Playlist(
            owner_account_id=playlist.owner_account_id,
            name="Unrelated user playlist",
            description="Must remain untouched",
            visibility="private",
            edit_policy="owner",
            creation_operation_id=uuid4(),
            creation_fingerprint="0" * 64,
        )
        db.add(unrelated)
        db.commit()
        unrelated_id = unrelated.id
    with Session(seed_database) as db:
        second = seed_demo_playlist(db)
        assert second.created is False
        assert second.skipped is True
    with Session(seed_database) as db:
        playlist = db.get(Playlist, playlist_id)
        entry = db.get(PlaylistEntry, entry_id)
        unrelated = db.get(Playlist, unrelated_id)
        assert playlist is not None
        assert playlist.name == "User-edited demo playlist"
        assert entry is not None
        assert entry.position == 20
        assert unrelated is not None
        assert unrelated.name == "Unrelated user playlist"
        assert db.scalar(select(func.count()).select_from(Playlist)) == 2


def test_demo_room_seed_is_additive_and_preserves_user_edits(seed_database) -> None:
    with Session(seed_database) as db:
        seed_demo_accounts(db)
        first = seed_demo_rooms(db)
        assert first.created == 2
        assert first.skipped == 0

    with Session(seed_database) as db:
        public = db.scalar(select(Room).where(Room.visibility == "public"))
        private = db.scalar(select(Room).where(Room.visibility == "private"))
        assert public is not None
        assert private is not None
        public_id, private_id = public.id, private.id
        public.name = "User-edited demo room"
        private.visibility = "public"
        db.commit()
        assert (
            db.scalar(
                select(func.count())
                .select_from(RoomInvitation)
                .where(RoomInvitation.room_id == private_id)
            )
            == 1
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(RoomMembership)
                .where(RoomMembership.room_id == public_id)
            )
            == 1
        )

    with Session(seed_database) as db:
        second = seed_demo_rooms(db)
        assert second.created == 0
        assert second.skipped == 2
        assert db.get(Room, public_id).name == "User-edited demo room"
        assert db.get(Room, private_id).visibility == "public"
        assert db.scalar(select(func.count()).select_from(Room)) == 2
