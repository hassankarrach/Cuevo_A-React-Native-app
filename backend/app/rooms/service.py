import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.errors import APIError
from app.auth.models import AuthRateLimitBucket
from app.auth.security import keyed_digest, utc_now
from app.core.config import Settings
from app.notifications.service import DestinationReference, create_notification
from app.rooms.models import (
    Room,
    RoomEvent,
    RoomInvitation,
    RoomJoinCode,
    RoomMembership,
)
from app.rooms.schemas import (
    RoomDetailResponse,
    RoomInvitationResponse,
    RoomParticipant,
    RoomPermissions,
    RoomResponse,
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


def get_room(db: Session, room_id: UUID, *, lock: bool = False) -> Room | None:
    statement = select(Room).where(Room.id == room_id)
    if lock:
        statement = statement.with_for_update()
    return db.scalar(
        statement.options(
            selectinload(Room.memberships),
            selectinload(Room.invitations),
        )
    )


def is_accepted_invitee(db: Session, room_id: UUID, account_id: UUID) -> bool:
    return (
        db.scalar(
            select(RoomInvitation.id).where(
                RoomInvitation.room_id == room_id,
                RoomInvitation.invitee_account_id == account_id,
                RoomInvitation.status == "accepted",
            )
        )
        is not None
    )


def is_member(db: Session, room_id: UUID, account_id: UUID) -> bool:
    return (
        db.scalar(
            select(RoomMembership.id).where(
                RoomMembership.room_id == room_id,
                RoomMembership.account_id == account_id,
            )
        )
        is not None
    )


def can_read(db: Session, room: Room, account_id: UUID) -> bool:
    if room.host_account_id == account_id:
        return True
    if room.status == "active" and room.visibility == "public":
        return True
    if is_member(db, room.id, account_id):
        return True
    return is_accepted_invitee(db, room.id, account_id)


def require_room_read(db: Session, room_id: UUID, account_id: UUID) -> Room:
    room = get_room(db, room_id)
    if room is None or not can_read(db, room, account_id):
        raise not_found()
    return room


def require_active_room(db: Session, room_id: UUID, account_id: UUID) -> Room:
    room = get_room(db, room_id, lock=True)
    if room is None or not can_read(db, room, account_id):
        raise not_found()
    if room.status != "active":
        raise APIError(409, "ROOM_ENDED", "This room has ended.")
    return room


def can_vote(db: Session, room: Room, account_id: UUID) -> bool:
    if not can_read(db, room, account_id):
        return False
    if room.status != "active":
        return False
    return (
        room.vote_eligibility == "everyone"
        or room.host_account_id == account_id
        or is_accepted_invitee(db, room.id, account_id)
    )


def room_response(
    db: Session,
    room: Room,
    viewer_id: UUID,
    *,
    detail: bool = False,
) -> RoomResponse:
    membership = next(
        (item for item in room.memberships if item.account_id == viewer_id), None
    )
    accepted_invitee = is_accepted_invitee(db, room.id, viewer_id)
    is_host = room.host_account_id == viewer_id
    is_member_role = membership is not None
    can_join = (
        room.status == "active"
        and not is_member_role
        and (room.visibility == "public" or accepted_invitee)
    )
    participants_count = db.scalar(
        select(func.count())
        .select_from(RoomMembership)
        .where(RoomMembership.room_id == room.id)
    ) or 0
    permissions = RoomPermissions(
        can_read=True,
        can_join=can_join,
        can_leave=room.status == "active" and is_member_role and not is_host,
        can_vote=can_vote(db, room, viewer_id),
        can_manage=is_host and room.status == "active",
        can_invite=is_host and room.status == "active",
    )
    common = dict(
        id=room.id,
        name=room.name,
        description=room.description,
        host_account_id=room.host_account_id,
        visibility=room.visibility,
        vote_eligibility=room.vote_eligibility,
        status=room.status,
        revision=str(room.revision),
        participants_count=participants_count,
        viewer_role="host" if is_host else "member" if is_member_role else "visitor",
        permissions=permissions,
        created_at=room.created_at,
        updated_at=room.updated_at,
        ended_at=room.ended_at,
    )
    if not detail:
        return RoomResponse(**common)
    participant_rows = db.scalars(
        select(RoomMembership)
        .where(RoomMembership.room_id == room.id)
        .order_by(RoomMembership.joined_at, RoomMembership.account_id)
    ).all()
    return RoomDetailResponse(
        **common,
        participants=[
            RoomParticipant(
                account_id=member.account_id,
                role=member.role,
                joined_at=member.joined_at,
            )
            for member in participant_rows
        ],
    )


def invitation_response(invitation: RoomInvitation) -> RoomInvitationResponse:
    return RoomInvitationResponse(
        id=invitation.id,
        room_id=invitation.room_id,
        invitee_account_id=invitation.invitee_account_id,
        inviter_account_id=invitation.inviter_account_id,
        status=invitation.status,
        created_at=invitation.created_at,
        updated_at=invitation.updated_at,
    )


def assert_expected_revision(room: Room, expected_revision: str) -> None:
    if room.revision != int(expected_revision):
        raise APIError(
            409,
            "REVISION_CONFLICT",
            "The room has changed. Refresh and try again.",
        )


def add_event(
    db: Session,
    room: Room,
    *,
    actor_id: UUID | None,
    event_type: str,
    operation_id: UUID | None = None,
    payload: dict[str, object] | None = None,
) -> RoomEvent:
    room.revision += 1
    room.updated_at = utc_now()
    event = RoomEvent(
        room_id=room.id,
        revision=room.revision,
        event_type=event_type,
        actor_account_id=actor_id,
        operation_id=operation_id,
        payload=payload or {},
    )
    db.add(event)
    db.flush()
    return event


def create_invitation_notification(
    db: Session,
    *,
    invitee_account_id: UUID,
    inviter_account_id: UUID,
    room_id: UUID,
    event_id: UUID,
) -> None:
    create_notification(
        db,
        recipient_account_id=invitee_account_id,
        producer_event_id=event_id,
        kind="room_invitation",
        actor_account_id=inviter_account_id,
        destination=DestinationReference(type="room", id=room_id),
    )


def list_visible_rooms(
    db: Session,
    account_id: UUID,
    *,
    query: str | None,
    after_id: UUID | None,
    limit: int,
) -> tuple[list[Room], bool]:
    accepted = select(RoomInvitation.id).where(
        RoomInvitation.room_id == Room.id,
        RoomInvitation.invitee_account_id == account_id,
        RoomInvitation.status == "accepted",
    )
    statement = select(Room).where(
        Room.status == "active",
        or_(
            Room.visibility == "public",
            Room.host_account_id == account_id,
            accepted.exists(),
        ),
    )
    if query:
        escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(Room.name.ilike(f"%{escaped}%", escape="\\"))
    if after_id is not None:
        statement = statement.where(Room.id > after_id)
    rows = list(
        db.scalars(
            statement.options(
                selectinload(Room.memberships),
                selectinload(Room.invitations),
            )
            .order_by(Room.id)
            .limit(limit + 1)
        ).all()
    )
    return rows[:limit], len(rows) > limit


def issue_join_code(db: Session, room: Room, settings: Settings) -> tuple[str, datetime]:
    alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    existing = db.scalar(
        select(RoomJoinCode).where(RoomJoinCode.room_id == room.id).with_for_update()
    )
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(6))
        digest = keyed_digest(settings, "room-join-code", code)
        collision = db.scalar(
            select(RoomJoinCode.id).where(RoomJoinCode.code_digest == digest)
        )
        if collision is None:
            break
    now = utc_now()
    expires_at = now + timedelta(hours=24)
    if existing is None:
        existing = RoomJoinCode(
            room_id=room.id,
            code_digest=digest,
            expires_at=expires_at,
        )
        db.add(existing)
    else:
        existing.code_digest = digest
        existing.created_at = now
        existing.expires_at = expires_at
        existing.revoked_at = None
    return code, expires_at


def record_join_code_failure(
    db: Session,
    settings: Settings,
    *,
    account_id: UUID,
    client_ip: str,
    now: datetime | None = None,
) -> bool:
    from sqlalchemy.dialects.postgresql import insert

    moment = (now or utc_now()).astimezone(UTC)
    window_seconds = 15 * 60
    window_epoch = int(moment.timestamp()) // window_seconds * window_seconds
    window_start = datetime.fromtimestamp(window_epoch, UTC)
    exceeded = False
    for kind, subject in (
        ("account", str(account_id)),
        ("ip", client_ip or "unknown"),
    ):
        bucket_key = keyed_digest(
            settings,
            "rate-limit",
            f"room-code-{kind}:{subject}:{window_epoch}",
        )
        count = db.scalar(
            insert(AuthRateLimitBucket)
            .values(
                bucket_key=bucket_key,
                window_start=window_start,
                request_count=1,
            )
            .on_conflict_do_update(
                index_elements=[AuthRateLimitBucket.bucket_key],
                set_={
                    "request_count": AuthRateLimitBucket.request_count + 1,
                },
            )
            .returning(AuthRateLimitBucket.request_count)
        )
        exceeded = exceeded or (count is not None and count > 5)
    db.execute(
        delete(AuthRateLimitBucket).where(
            AuthRateLimitBucket.window_start < moment - timedelta(days=1)
        )
    )
    db.commit()
    return exceeded


def active_join_code(
    db: Session,
    settings: Settings,
    code: str,
    *,
    now: datetime | None = None,
) -> RoomJoinCode | None:
    digest = keyed_digest(settings, "room-join-code", code)
    moment = now or utc_now()
    return db.scalar(
        select(RoomJoinCode).where(
            RoomJoinCode.code_digest == digest,
            RoomJoinCode.revoked_at.is_(None),
            RoomJoinCode.expires_at > moment,
        )
    )
