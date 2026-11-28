import asyncio
import base64
import binascii
from datetime import UTC, datetime
from queue import Empty
import re
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    Depends,
    Path,
    Query,
    Request,
    Response,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import APIError
from app.auth.dependencies import Principal, current_principal
from app.auth.models import Account, AuthSession
from app.auth.security import keyed_digest, utc_now
from app.db.session import SessionLocal, get_db
from app.notifications.service import DestinationReference, create_notification
from app.rooms.models import (
    Room,
    RoomEvent,
    RoomInvitation,
    RoomJoinCode,
    RoomMembership,
)
from app.rooms.realtime import RoomEventHub, RoomSubscription, closed_signal
from app.rooms.schemas import (
    RoomCodeResponse,
    RoomCreate,
    RoomDetailResponse,
    RoomEventResponse,
    RoomInvitationCreate,
    RoomInvitationListResponse,
    RoomInvitationRespond,
    RoomInvitationResponse,
    RoomJoinCodeRedeem,
    RoomJoinCodeResponse,
    RoomListResponse,
    RoomMutation,
    RoomResponse,
    RoomUpdate,
)
from app.rooms.service import (
    active_join_code,
    add_event,
    can_read,
    create_invitation_notification,
    get_room,
    invitation_response,
    is_accepted_invitee,
    issue_join_code,
    list_visible_rooms,
    not_found,
    record_join_code_failure,
    request_fingerprint,
    require_active_room,
    require_room_read,
    room_response,
    assert_expected_revision,
)


router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])
_PAGE_SIZE_DEFAULT = 20
_PAGE_SIZE_MAX = 50
_CURSOR_PATTERN = re.compile(r"^[0-9a-f-]{36}$")
_REVISION_PATTERN = re.compile(r"^[1-9][0-9]{0,17}$")


def _hub(request: Request) -> RoomEventHub:
    return request.app.state.room_event_hub


def _event_dict(event: RoomEvent) -> dict[str, object]:
    return RoomEventResponse(
        event_id=event.id,
        type=event.event_type,
        resource_id=event.room_id,
        revision=str(event.revision),
        occurred_at=event.occurred_at,
        operation_id=event.operation_id,
        payload=event.payload,
    ).model_dump(mode="json", by_alias=True)


def _emit_after_commit(
    request: Request,
    room_id: UUID,
    event: dict[str, object],
    *,
    close_after_publish: bool = False,
) -> None:
    db = SessionLocal()
    try:
        def authorized(subscription: RoomSubscription) -> bool:
            auth_session = db.get(
                AuthSession, subscription.session_id, populate_existing=True
            )
            now = utc_now()
            if (
                auth_session is None
                or auth_session.revoked_at is not None
                or auth_session.access_expires_at <= now
                or auth_session.absolute_expires_at <= now
                or auth_session.access_token_digest
                != subscription.access_token_digest
            ):
                return False
            room = get_room(db, room_id)
            return room is not None and can_read(db, room, subscription.account_id)

        _hub(request).publish(
            room_id,
            event,
            authorized,
            close_after_publish=close_after_publish,
        )
    finally:
        db.close()


def _commit_and_emit(
    request: Request,
    db: Session,
    room_id: UUID,
    event: RoomEvent | None,
    *,
    close_after_publish: bool = False,
) -> None:
    value = _event_dict(event) if event is not None else None
    db.commit()
    if value is not None:
        _emit_after_commit(
            request,
            room_id,
            value,
            close_after_publish=close_after_publish,
        )


def _decode_cursor(cursor: str | None, query: str | None) -> UUID | None:
    if cursor is None:
        return None
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        decoded = base64.b64decode(
            padded.encode("ascii"), altchars=b"-_", validate=True
        ).decode("ascii")
        version, fingerprint, after_id = decoded.split("\n")
        expected = request_fingerprint("room-list", {"query": query})
        if (
            version != "v1"
            or fingerprint != expected
            or not _CURSOR_PATTERN.fullmatch(after_id)
        ):
            raise ValueError
        return UUID(after_id)
    except (ValueError, UnicodeDecodeError, UnicodeEncodeError, binascii.Error) as exc:
        raise APIError(
            422,
            "INVALID_CURSOR",
            "The pagination cursor is invalid for this room search.",
        ) from exc


def _encode_cursor(room_id: UUID, query: str | None) -> str:
    fingerprint = request_fingerprint("room-list", {"query": query})
    raw = f"v1\n{fingerprint}\n{room_id}".encode("ascii")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _load_owned_invitation(
    db: Session,
    invitation_id: UUID,
    account_id: UUID,
) -> RoomInvitation:
    invitation = db.scalar(
        select(RoomInvitation).where(
            RoomInvitation.id == invitation_id,
            RoomInvitation.invitee_account_id == account_id,
        )
    )
    if invitation is None:
        raise not_found()
    return invitation


@router.post("", response_model=RoomDetailResponse, status_code=201)
def create_room(
    body: RoomCreate,
    request: Request,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomDetailResponse:
    host_id = principal.account.id
    db.scalar(select(Account).where(Account.id == host_id).with_for_update())
    fingerprint = request_fingerprint(
        "room.create", body.model_dump(mode="json", by_alias=True)
    )
    previous = db.scalar(
        select(Room).where(
            Room.host_account_id == host_id,
            Room.creation_operation_id == body.operation_id,
        )
    )
    if previous is not None:
        if previous.creation_fingerprint != fingerprint:
            raise APIError(
                409,
                "IDEMPOTENCY_CONFLICT",
                "The operation ID was already used for a different request.",
            )
        response = room_response(db, previous, host_id, detail=True)
        db.commit()
        return response
    if body.vote_eligibility == "invitees":
        raise APIError(
            403,
            "LICENSE_REQUIRED",
            "An invitees-only voting license is required for this policy.",
        )
    room = Room(
        host_account_id=host_id,
        name=body.name,
        description=body.description,
        visibility=body.visibility,
        vote_eligibility=body.vote_eligibility,
        creation_operation_id=body.operation_id,
        creation_fingerprint=fingerprint,
    )
    db.add(room)
    db.flush()
    host_membership = RoomMembership(
        room_id=room.id,
        account_id=host_id,
        role="host",
    )
    room.memberships.append(host_membership)
    db.add(host_membership)
    event = RoomEvent(
        room_id=room.id,
        revision=room.revision,
        event_type="room.created",
        actor_account_id=host_id,
        operation_id=body.operation_id,
        payload={},
    )
    db.add(event)
    db.flush()
    response = room_response(db, room, host_id, detail=True)
    _commit_and_emit(request, db, room.id, event)
    return response


@router.get("", response_model=RoomListResponse)
def list_rooms(
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=_PAGE_SIZE_MAX)] = _PAGE_SIZE_DEFAULT,
    cursor: Annotated[str | None, Query(max_length=256)] = None,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomListResponse:
    query = " ".join(q.split()).casefold() if q and q.strip() else None
    after_id = _decode_cursor(cursor, query)
    rows, has_more = list_visible_rooms(
        db,
        principal.account.id,
        query=query,
        after_id=after_id,
        limit=limit,
    )
    return RoomListResponse(
        items=[room_response(db, room, principal.account.id) for room in rows],
        next_cursor=_encode_cursor(rows[-1].id, query) if has_more else None,
    )


@router.post("/join-by-code", response_model=RoomCodeResponse)
def redeem_join_code(
    body: RoomJoinCodeRedeem,
    request: Request,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomCodeResponse:
    settings = request.app.state.settings
    code = body.code
    join_code = active_join_code(db, settings, code)
    room = None
    if join_code is not None:
        room = get_room(db, join_code.room_id, lock=True)
    authorized = (
        room is not None
        and room.status == "active"
        and (
            room.visibility == "public"
            or is_accepted_invitee(db, room.id, principal.account.id)
        )
    )
    if not authorized or room is None:
        exceeded = record_join_code_failure(
            db,
            settings,
            account_id=principal.account.id,
            client_ip=request.client.host if request.client else "unknown",
        )
        if exceeded:
            raise APIError(
                429,
                "RATE_LIMITED",
                "Too many requests. Try again later.",
                retry_after_seconds=900,
            )
        raise not_found()
    if not any(
        item.account_id == principal.account.id for item in room.memberships
    ):
        member = RoomMembership(
            room_id=room.id,
            account_id=principal.account.id,
            role="member",
        )
        room.memberships.append(member)
        db.add(member)
        event = add_event(
            db,
            room,
            actor_id=principal.account.id,
            event_type="room.member.joined",
        )
    else:
        event = None
    response = RoomCodeResponse(
        joined=True,
        room=room_response(db, room, principal.account.id),
    )
    _commit_and_emit(request, db, room.id, event)
    return response


@router.get("/invitations", response_model=RoomInvitationListResponse)
def list_room_invitations(
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomInvitationListResponse:
    rows = db.scalars(
        select(RoomInvitation)
        .join(Room, Room.id == RoomInvitation.room_id)
        .where(
            RoomInvitation.invitee_account_id == principal.account.id,
            RoomInvitation.status == "pending",
        )
        .order_by(RoomInvitation.created_at.desc(), RoomInvitation.id.desc())
    ).all()
    return RoomInvitationListResponse(
        items=[invitation_response(row) for row in rows]
    )


@router.get("/{roomId}", response_model=RoomDetailResponse)
def get_room_snapshot(
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomDetailResponse:
    room = require_room_read(db, room_id, principal.account.id)
    return room_response(db, room, principal.account.id, detail=True)


@router.patch("/{roomId}", response_model=RoomResponse)
def update_room(
    body: RoomUpdate,
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = require_active_room(db, room_id, principal.account.id)
    if room.host_account_id != principal.account.id:
        raise APIError(403, "FORBIDDEN", "Only the room host may manage this room.")
    assert_expected_revision(room, body.expected_revision)
    if body.vote_eligibility == "invitees" and room.vote_eligibility != "invitees":
        raise APIError(
            403,
            "LICENSE_REQUIRED",
            "An invitees-only voting license is required for this policy.",
        )
    values = body.model_dump(exclude_unset=True)
    for key in ("name", "description", "visibility", "vote_eligibility"):
        if key in values:
            setattr(room, key, values[key])
    if room.visibility == "private":
        accepted_ids = set(
            db.scalars(
                select(RoomInvitation.invitee_account_id).where(
                    RoomInvitation.room_id == room.id,
                    RoomInvitation.status == "accepted",
                )
            ).all()
        )
        for member in list(room.memberships):
            if member.role != "host" and member.account_id not in accepted_ids:
                room.memberships.remove(member)
                db.delete(member)
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        operation_id=body.operation_id,
        event_type="room.updated",
        payload={"change": "room"},
    )
    response = room_response(db, room, principal.account.id)
    _commit_and_emit(request, db, room.id, event)
    return response


@router.post("/{roomId}/join", response_model=RoomResponse)
def join_room(
    body: RoomMutation,
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = require_active_room(db, room_id, principal.account.id)
    if room.host_account_id == principal.account.id or any(
        item.account_id == principal.account.id for item in room.memberships
    ):
        raise APIError(409, "ALREADY_JOINED", "You are already a room participant.")
    if room.visibility == "private" and not is_accepted_invitee(
        db, room.id, principal.account.id
    ):
        raise not_found()
    assert_expected_revision(room, body.expected_revision)
    member = RoomMembership(
        room_id=room.id,
        account_id=principal.account.id,
        role="member",
    )
    room.memberships.append(member)
    db.add(member)
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        operation_id=body.operation_id,
        event_type="room.member.joined",
    )
    response = room_response(db, room, principal.account.id)
    _commit_and_emit(request, db, room.id, event)
    return response


@router.post("/{roomId}/leave", response_model=RoomResponse)
def leave_room(
    body: RoomMutation,
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = require_active_room(db, room_id, principal.account.id)
    member = db.scalar(
        select(RoomMembership)
        .where(
            RoomMembership.room_id == room.id,
            RoomMembership.account_id == principal.account.id,
        )
        .with_for_update()
    )
    if member is None:
        raise APIError(409, "NOT_A_MEMBER", "You are not a room participant.")
    if member.role == "host":
        raise APIError(
            409,
            "HOST_CANNOT_LEAVE",
            "The host must end the room instead of leaving it.",
        )
    assert_expected_revision(room, body.expected_revision)
    room.memberships.remove(member)
    db.delete(member)
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        operation_id=body.operation_id,
        event_type="room.member.left",
    )
    response = room_response(db, room, principal.account.id)
    _commit_and_emit(request, db, room.id, event)
    return response


@router.get("/{roomId}/participants", response_model=RoomDetailResponse)
def get_room_participants(
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomDetailResponse:
    room = require_room_read(db, room_id, principal.account.id)
    return room_response(db, room, principal.account.id, detail=True)


@router.post("/{roomId}/end", response_model=RoomResponse)
def end_room(
    body: RoomMutation,
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomResponse:
    room = require_active_room(db, room_id, principal.account.id)
    if room.host_account_id != principal.account.id:
        raise APIError(403, "FORBIDDEN", "Only the room host may end this room.")
    assert_expected_revision(room, body.expected_revision)
    room.status = "ended"
    room.ended_at = utc_now()
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        operation_id=body.operation_id,
        event_type="room.ended",
    )
    response = room_response(db, room, principal.account.id)
    _commit_and_emit(request, db, room.id, event, close_after_publish=True)
    return response


@router.post(
    "/{roomId}/invitations",
    response_model=RoomInvitationResponse,
    status_code=201,
)
def invite_to_room(
    body: RoomInvitationCreate,
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomInvitationResponse:
    room = require_active_room(db, room_id, principal.account.id)
    if room.host_account_id != principal.account.id:
        raise APIError(403, "FORBIDDEN", "Only the room host may invite accounts.")
    assert_expected_revision(room, body.expected_revision)
    invitee = db.get(Account, body.invitee_account_id)
    if invitee is None or invitee.id == room.host_account_id:
        raise not_found()
    active = db.scalar(
        select(RoomInvitation).where(
            RoomInvitation.room_id == room.id,
            RoomInvitation.invitee_account_id == invitee.id,
            RoomInvitation.status.in_(("pending", "accepted")),
        )
    )
    if active is not None:
        raise APIError(
            409,
            "INVITATION_ALREADY_ACTIVE",
            "An active invitation already exists for this account.",
        )
    invitation = RoomInvitation(
        room_id=room.id,
        invitee_account_id=invitee.id,
        inviter_account_id=principal.account.id,
        status="pending",
    )
    db.add(invitation)
    db.flush()
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        operation_id=body.operation_id,
        event_type="room.invitation.updated",
        payload={"change": "invitation"},
    )
    create_invitation_notification(
        db,
        invitee_account_id=invitee.id,
        inviter_account_id=principal.account.id,
        room_id=room.id,
        event_id=event.id,
    )
    result = invitation_response(invitation)
    _commit_and_emit(request, db, room.id, event)
    return result


@router.post(
    "/invitations/{invitationId}/respond",
    response_model=RoomInvitationResponse,
)
def respond_to_room_invitation(
    body: RoomInvitationRespond,
    request: Request,
    invitation_id: UUID = Path(alias="invitationId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomInvitationResponse:
    invitation = _load_owned_invitation(db, invitation_id, principal.account.id)
    room = get_room(db, invitation.room_id, lock=True)
    if room is None:
        raise not_found()
    invitation = db.scalar(
        select(RoomInvitation)
        .where(RoomInvitation.id == invitation_id)
        .with_for_update()
    )
    if invitation is None:
        raise not_found()
    if invitation.status != "pending":
        raise APIError(
            409,
            "INVITATION_NOT_PENDING",
            "This room invitation is no longer pending.",
        )
    if room.status != "active":
        raise APIError(409, "ROOM_ENDED", "This room has ended.")
    invitation.status = body.response
    invitation.updated_at = utc_now()
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        event_type="room.invitation.updated",
        payload={"change": "invitation"},
    )
    create_notification(
        db,
        recipient_account_id=room.host_account_id,
        producer_event_id=event.id,
        kind="room_activity",
        actor_account_id=principal.account.id,
        destination=DestinationReference(type="room", id=room.id),
    )
    response = invitation_response(invitation)
    _commit_and_emit(request, db, room.id, event)
    return response


@router.delete(
    "/{roomId}/invitations/{invitationId}",
    response_model=RoomInvitationResponse,
)
def revoke_room_invitation(
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    invitation_id: UUID = Path(alias="invitationId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomInvitationResponse:
    room = require_active_room(db, room_id, principal.account.id)
    if room.host_account_id != principal.account.id:
        raise APIError(403, "FORBIDDEN", "Only the room host may revoke invitations.")
    invitation = db.scalar(
        select(RoomInvitation)
        .where(
            RoomInvitation.id == invitation_id,
            RoomInvitation.room_id == room.id,
        )
        .with_for_update()
    )
    if invitation is None or invitation.status not in {"pending", "accepted"}:
        raise not_found()
    invitation.status = "revoked"
    invitation.updated_at = utc_now()
    member = db.scalar(
        select(RoomMembership).where(
            RoomMembership.room_id == room.id,
            RoomMembership.account_id == invitation.invitee_account_id,
        )
    )
    if member is not None:
        db.delete(member)
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        event_type="room.invitation.updated",
        payload={"change": "invitation"},
    )
    create_notification(
        db,
        recipient_account_id=invitation.invitee_account_id,
        producer_event_id=event.id,
        kind="room_invitation",
        actor_account_id=principal.account.id,
        destination=DestinationReference(type="room", id=room.id),
    )
    response = invitation_response(invitation)
    _commit_and_emit(request, db, room.id, event)
    return response


@router.post(
    "/{roomId}/join-code",
    response_model=RoomJoinCodeResponse,
)
def rotate_room_join_code(
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RoomJoinCodeResponse:
    room = require_active_room(db, room_id, principal.account.id)
    if room.host_account_id != principal.account.id:
        raise APIError(403, "FORBIDDEN", "Only the room host may manage its join code.")
    code, expires_at = issue_join_code(db, room, request.app.state.settings)
    event = add_event(
        db,
        room,
        actor_id=principal.account.id,
        event_type="room.join_code.rotated",
    )
    response = RoomJoinCodeResponse(room_id=room.id, code=code, expires_at=expires_at)
    _commit_and_emit(request, db, room.id, event)
    return response


@router.delete("/{roomId}/join-code", status_code=204)
def revoke_room_join_code(
    request: Request,
    room_id: UUID = Path(alias="roomId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> Response:
    room = require_active_room(db, room_id, principal.account.id)
    if room.host_account_id != principal.account.id:
        raise APIError(403, "FORBIDDEN", "Only the room host may manage its join code.")
    code = db.scalar(
        select(RoomJoinCode)
        .where(RoomJoinCode.room_id == room.id)
        .with_for_update()
    )
    if code is not None and code.revoked_at is None:
        code.revoked_at = utc_now()
        event = add_event(
            db,
            room,
            actor_id=principal.account.id,
            event_type="room.join_code.revoked",
        )
        _commit_and_emit(request, db, room.id, event)
    else:
        db.commit()
    return Response(status_code=204)


def _websocket_credentials(
    websocket: WebSocket,
    db: Session,
) -> tuple[UUID, UUID, str] | None:
    authorization = websocket.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token or len(token) > 128:
        return None
    digest = keyed_digest(
        websocket.app.state.settings, "access-token", token.strip()
    )
    result = db.execute(
        select(AuthSession, Account)
        .join(Account, Account.id == AuthSession.account_id)
        .where(AuthSession.access_token_digest == digest)
    ).first()
    if result is None:
        return None
    auth_session, account = result
    now = utc_now()
    if (
        auth_session.revoked_at is not None
        or auth_session.access_expires_at <= now
        or auth_session.absolute_expires_at <= now
    ):
        return None
    return account.id, auth_session.id, digest


@router.websocket("/{roomId}/events")
async def room_events(
    websocket: WebSocket,
    room_id: UUID = Path(alias="roomId"),
    after_revision: str | None = Query(default=None, alias="afterRevision"),
) -> None:
    if after_revision is not None and not _REVISION_PATTERN.fullmatch(after_revision):
        await websocket.close(code=4400)
        return
    with SessionLocal() as db:
        credentials = _websocket_credentials(websocket, db)
        if credentials is None:
            await websocket.close(code=4401)
            return
        account_id, session_id, access_token_digest = credentials
        room = get_room(db, room_id)
        if room is None or not can_read(db, room, account_id):
            await websocket.close(code=4404)
            return
        current_revision = room.revision

    hub: RoomEventHub = websocket.app.state.room_event_hub
    subscription = hub.subscribe(
        room_id,
        account_id,
        session_id,
        access_token_digest,
        int(after_revision) if after_revision is not None else 0,
    )
    await websocket.accept()
    try:
        with SessionLocal() as db:
            room = get_room(db, room_id)
            if room is None or not can_read(db, room, account_id):
                await websocket.close(code=4404)
                return
            current_revision = room.revision
        hub.set_revision(subscription, current_revision)
        if after_revision is None or int(after_revision) != current_revision:
            await websocket.send_json(
                {
                    "eventId": str(uuid4()),
                    "type": "room.resync_required",
                    "resourceType": "room",
                    "resourceId": str(room_id),
                    "revision": str(current_revision),
                    "occurredAt": datetime.now(UTC).isoformat(),
                    "operationId": None,
                    "payload": {"reason": "revision_gap"},
                }
            )
        next_heartbeat = asyncio.get_running_loop().time() + 25
        receive_task = asyncio.create_task(websocket.receive())
        while True:
            queue_task = asyncio.create_task(
                asyncio.to_thread(subscription.events.get, True, 1)
            )
            done, _pending = await asyncio.wait(
                {receive_task, queue_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            if receive_task in done:
                incoming = receive_task.result()
                if incoming["type"] == "websocket.disconnect":
                    queue_task.cancel()
                    return
                receive_task = asyncio.create_task(websocket.receive())
            if queue_task in done:
                try:
                    message = queue_task.result()
                except Empty:
                    message = None
                if message is closed_signal():
                    await websocket.close(code=4404)
                    return
                if message is not None:
                    await websocket.send_json(message)
            else:
                queue_task.cancel()
            if asyncio.get_running_loop().time() >= next_heartbeat:
                with SessionLocal() as db:
                    auth_session = db.get(AuthSession, session_id)
                    room = get_room(db, room_id)
                    if (
                        auth_session is None
                        or auth_session.revoked_at is not None
                        or auth_session.access_expires_at <= utc_now()
                        or auth_session.absolute_expires_at <= utc_now()
                        or auth_session.access_token_digest != access_token_digest
                    ):
                        await websocket.close(code=4401)
                        return
                    if room is None or not can_read(db, room, account_id):
                        await websocket.close(code=4404)
                        return
                await websocket.send_json({"type": "heartbeat"})
                next_heartbeat = asyncio.get_running_loop().time() + 25
    except WebSocketDisconnect:
        return
    finally:
        hub.unsubscribe(subscription)
