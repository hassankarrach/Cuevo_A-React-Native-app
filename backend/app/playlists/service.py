import hashlib
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.errors import APIError
from app.auth.models import Account
from app.auth.security import utc_now
from app.catalog.models import Song
from app.notifications.service import DestinationReference, create_notification
from app.playlists.models import (
    Playlist,
    PlaylistEditLicense,
    PlaylistEntry,
    PlaylistEvent,
    PlaylistInvitation,
    PlaylistOperation,
)
from app.playlists.schemas import (
    PlaylistEntryResponse,
    PlaylistInvitationResponse,
    PlaylistPermissions,
    PlaylistResponse,
)


def not_found() -> APIError:
    return APIError(404, "NOT_FOUND", "The requested resource was not found.")


def request_fingerprint(kind: str, data: dict[str, Any]) -> str:
    encoded = json.dumps(
        {"kind": kind, "data": data},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def can_read(db: Session, playlist: Playlist, account_id: UUID) -> bool:
    if playlist.visibility == "public" or playlist.owner_account_id == account_id:
        return True
    invitation_id = db.scalar(
        select(PlaylistInvitation.id).where(
            PlaylistInvitation.playlist_id == playlist.id,
            PlaylistInvitation.invitee_account_id == account_id,
            PlaylistInvitation.status == "accepted",
        )
    )
    return invitation_id is not None


def can_edit(db: Session, playlist: Playlist, account_id: UUID) -> bool:
    if playlist.owner_account_id == account_id:
        return True
    if not can_read(db, playlist, account_id):
        return False
    if playlist.edit_policy == "everyone":
        return True
    if playlist.edit_policy == "collaborators":
        if not can_use_invited_edit_policy(db, playlist.owner_account_id):
            return False
        return (
            db.scalar(
                select(PlaylistInvitation.id).where(
                    PlaylistInvitation.playlist_id == playlist.id,
                    PlaylistInvitation.invitee_account_id == account_id,
                    PlaylistInvitation.status == "accepted",
                )
            )
            is not None
        )
    return False


def can_use_invited_edit_policy(
    db: Session,
    owner_account_id: UUID,
    *,
    now: datetime | None = None,
) -> bool:
    moment = now or utc_now()
    return (
        db.scalar(
            select(PlaylistEditLicense.id).where(
                PlaylistEditLicense.account_id == owner_account_id,
                PlaylistEditLicense.license_key == "playlist_invited_edit",
                or_(
                    PlaylistEditLicense.expires_at.is_(None),
                    PlaylistEditLicense.expires_at > moment,
                ),
            )
        )
        is not None
    )


def grant_playlist_edit_license(
    db: Session,
    account_id: UUID,
    *,
    expires_at: datetime | None,
) -> PlaylistEditLicense:
    license_record = db.scalar(
        select(PlaylistEditLicense)
        .where(
            PlaylistEditLicense.account_id == account_id,
            PlaylistEditLicense.license_key == "playlist_invited_edit",
        )
        .with_for_update()
    )
    if license_record is None:
        license_record = PlaylistEditLicense(
            account_id=account_id,
            license_key="playlist_invited_edit",
            expires_at=expires_at,
        )
        db.add(license_record)
    else:
        license_record.expires_at = expires_at
        license_record.granted_at = utc_now()
    db.flush()
    return license_record


def revoke_playlist_edit_license(db: Session, account_id: UUID) -> bool:
    license_record = db.scalar(
        select(PlaylistEditLicense)
        .where(
            PlaylistEditLicense.account_id == account_id,
            PlaylistEditLicense.license_key == "playlist_invited_edit",
        )
        .with_for_update()
    )
    if license_record is None:
        return False
    db.delete(license_record)
    db.flush()
    return True


def get_playlist(
    db: Session,
    playlist_id: UUID,
    *,
    lock: bool = False,
) -> Playlist | None:
    statement = select(Playlist).where(Playlist.id == playlist_id)
    if lock:
        statement = statement.with_for_update()
    return db.scalar(
        statement.options(
            selectinload(Playlist.entries),
            selectinload(Playlist.invitations),
        )
    )


def require_playlist_read(
    db: Session, playlist_id: UUID, account_id: UUID
) -> Playlist:
    playlist = get_playlist(db, playlist_id)
    if playlist is None or not can_read(db, playlist, account_id):
        raise not_found()
    return playlist


def playlist_response(
    db: Session,
    playlist: Playlist,
    viewer_id: UUID,
) -> PlaylistResponse:
    accepted = sorted(
        {
            invitation.invitee_account_id
            for invitation in playlist.invitations
            if invitation.status == "accepted"
        },
        key=str,
    )
    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        owner_account_id=playlist.owner_account_id,
        visibility=playlist.visibility,
        edit_policy=playlist.edit_policy,
        collaborator_ids=accepted,
        entries=[
            PlaylistEntryResponse(
                id=entry.id,
                song_id=entry.song_id,
                added_by_account_id=entry.added_by_account_id,
                position=entry.position,
                created_at=entry.created_at,
            )
            for entry in sorted(playlist.entries, key=lambda value: value.position)
        ],
        revision=str(playlist.revision),
        updated_at=playlist.updated_at,
        permissions=PlaylistPermissions(
            can_read=True,
            can_edit=can_edit(db, playlist, viewer_id),
            can_manage=playlist.owner_account_id == viewer_id,
        ),
    )


def invitation_response(
    invitation: PlaylistInvitation,
) -> PlaylistInvitationResponse:
    return PlaylistInvitationResponse(
        id=invitation.id,
        playlist_id=invitation.playlist_id,
        invitee_account_id=invitation.invitee_account_id,
        inviter_account_id=invitation.inviter_account_id,
        status=invitation.status,
        created_at=invitation.created_at,
        updated_at=invitation.updated_at,
    )


def lock_and_authorize_editor(
    db: Session,
    playlist_id: UUID,
    actor_id: UUID,
    *,
    manage: bool = False,
) -> Playlist:
    playlist = get_playlist(db, playlist_id, lock=True)
    if playlist is None:
        raise not_found()
    authorized = (
        playlist.owner_account_id == actor_id
        if manage
        else can_edit(db, playlist, actor_id)
    )
    if not authorized:
        if playlist.visibility == "private" and not can_read(db, playlist, actor_id):
            raise not_found()
        raise APIError(403, "FORBIDDEN", "You are not allowed to edit this playlist.")
    return playlist


def check_idempotency(
    db: Session,
    playlist: Playlist,
    actor_id: UUID,
    operation_id: UUID,
    fingerprint: str,
) -> PlaylistOperation | None:
    previous = db.scalar(
        select(PlaylistOperation).where(
            PlaylistOperation.playlist_id == playlist.id,
            PlaylistOperation.operation_id == operation_id,
        )
    )
    if previous is None:
        return None
    if (
        previous.actor_account_id != actor_id
        or previous.request_fingerprint != fingerprint
    ):
        raise APIError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "The operation ID was already used for a different request.",
        )
    return previous


def begin_operation(
    db: Session,
    playlist: Playlist,
    *,
    actor_id: UUID,
    expected_revision: str,
    operation_id: UUID,
    fingerprint: str,
    event_type: str,
    payload: dict[str, object],
    result_resource_id: UUID | None = None,
) -> tuple[PlaylistOperation | None, PlaylistEvent | None]:
    previous = check_idempotency(
        db, playlist, actor_id, operation_id, fingerprint
    )
    if previous is not None:
        return previous, None
    assert_expected_revision(playlist, expected_revision)

    next_revision = playlist.revision + 1
    now = utc_now()
    playlist.revision = next_revision
    playlist.updated_at = now
    operation = PlaylistOperation(
        playlist_id=playlist.id,
        operation_id=operation_id,
        actor_account_id=actor_id,
        request_fingerprint=fingerprint,
        result_revision=next_revision,
        result_resource_id=result_resource_id,
    )
    event = PlaylistEvent(
        id=uuid4(),
        playlist_id=playlist.id,
        revision=next_revision,
        event_type=event_type,
        operation_id=operation_id,
        payload=payload,
        occurred_at=now,
    )
    db.add_all([operation, event])
    db.flush()
    return None, event


def assert_expected_revision(playlist: Playlist, expected_revision: str) -> None:
    if int(expected_revision) != playlist.revision:
        raise APIError(
            409,
            "REVISION_CONFLICT",
            "The playlist changed. Fetch the latest snapshot and retry.",
            details={"currentRevision": str(playlist.revision)},
        )


def list_visible_playlists(
    db: Session,
    account_id: UUID,
    *,
    query: str | None,
    after_id: UUID | None,
    limit: int,
) -> tuple[list[Playlist], bool]:
    visible_private = select(PlaylistInvitation.id).where(
        PlaylistInvitation.playlist_id == Playlist.id,
        PlaylistInvitation.invitee_account_id == account_id,
        PlaylistInvitation.status == "accepted",
    )
    statement = select(Playlist).where(
        or_(
            Playlist.visibility == "public",
            Playlist.owner_account_id == account_id,
            visible_private.exists(),
        )
    )
    if query:
        escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(Playlist.name.ilike(f"%{escaped}%", escape="\\"))
    if after_id is not None:
        statement = statement.where(Playlist.id > after_id)
    rows = list(
        db.scalars(
            statement.options(
                selectinload(Playlist.entries),
                selectinload(Playlist.invitations),
            )
            .order_by(Playlist.id)
            .limit(limit + 1)
        ).all()
    )
    has_more = len(rows) > limit
    return rows[:limit], has_more


def add_entries(
    db: Session,
    playlist: Playlist,
    *,
    actor_id: UUID,
    song_ids: list[UUID],
) -> None:
    songs = set(
        db.scalars(select(Song.id).where(Song.id.in_(song_ids))).all()
    )
    if songs != set(song_ids):
        raise APIError(404, "SONG_NOT_FOUND", "One or more songs were not found.")
    existing = {entry.song_id for entry in playlist.entries}
    if existing.intersection(song_ids):
        raise APIError(
            409,
            "DUPLICATE_SONG",
            "A song may occur only once in a playlist.",
        )
    position = len(playlist.entries)
    new_entries = [
        PlaylistEntry(
            playlist_id=playlist.id,
            song_id=song_id,
            added_by_account_id=actor_id,
            position=position + offset,
        )
        for offset, song_id in enumerate(song_ids)
    ]
    playlist.entries.extend(new_entries)
    db.add_all(new_entries)


def remove_entry(db: Session, playlist: Playlist, entry_id: UUID) -> None:
    entry = next((item for item in playlist.entries if item.id == entry_id), None)
    if entry is None:
        raise not_found()
    playlist.entries.remove(entry)
    db.delete(entry)
    db.flush()
    remaining = sorted(playlist.entries, key=lambda item: item.position)
    for index, item in enumerate(remaining):
        item.position = item.position + len(remaining) + 1
    db.flush()
    for index, item in enumerate(remaining):
        item.position = index


def reorder_entries(
    db: Session,
    playlist: Playlist,
    entry_ids: list[UUID],
) -> None:
    current = {entry.id: entry for entry in playlist.entries}
    if len(entry_ids) != len(current) or set(entry_ids) != set(current):
        raise APIError(
            409,
            "ENTRY_SET_CHANGED",
            "The reorder must include every current playlist entry exactly once.",
        )
    offset = len(current) + 1
    for entry in current.values():
        entry.position = entry.position + offset
    db.flush()
    for index, entry_id in enumerate(entry_ids):
        current[entry_id].position = index


def lookup_account(db: Session, account_id: UUID) -> Account | None:
    return db.get(Account, account_id)
