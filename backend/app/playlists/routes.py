import asyncio
import base64
import binascii
from datetime import UTC, datetime
from time import monotonic
from queue import Empty
import re
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Path, Query, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import APIError
from app.auth.dependencies import Principal, current_principal
from app.auth.models import Account, AuthSession
from app.auth.security import keyed_digest, utc_now
from app.db.session import SessionLocal, get_db
from app.notifications.service import DestinationReference, create_notification
from app.playlists.models import (
    Playlist,
    PlaylistDeletion,
    PlaylistEvent,
    PlaylistInvitation,
)
from app.playlists.realtime import (
    PlaylistEventHub,
    PlaylistSubscription,
    closed_signal,
)
from app.playlists.schemas import (
    AddEntries,
    PlaylistCreate,
    PlaylistDeleteResponse,
    PlaylistEventResponse,
    PlaylistInvitationCreate,
    PlaylistInvitationListResponse,
    PlaylistInvitationRespond,
    PlaylistInvitationResponse,
    PlaylistListResponse,
    PlaylistMutation,
    PlaylistResponse,
    PlaylistUpdate,
    RemoveEntry,
    ReorderEntries,
)
from app.playlists.service import (
    add_entries,
    assert_expected_revision,
    begin_operation,
    can_read,
    can_use_invited_edit_policy,
    check_idempotency,
    get_playlist,
    invitation_response,
    list_visible_playlists,
    lock_and_authorize_editor,
    lookup_account,
    not_found,
    playlist_response,
    remove_entry,
    reorder_entries,
    request_fingerprint,
    require_playlist_read,
)


router = APIRouter(prefix="/api/v1/playlists", tags=["playlists"])
_PAGE_SIZE_DEFAULT = 20
_PAGE_SIZE_MAX = 50
_CURSOR_PATTERN = re.compile(r"^[0-9a-f-]{36}$")
_REVISION_PATTERN = re.compile(r"^[1-9][0-9]{0,17}$")


def _hub(request: Request) -> PlaylistEventHub:
    return request.app.state.playlist_event_hub


def _event_dict(event: PlaylistEvent) -> dict[str, object]:
    return PlaylistEventResponse(
        event_id=event.id,
        type=event.event_type,
        resource_id=event.playlist_id,
        revision=str(event.revision),
        occurred_at=event.occurred_at,
        operation_id=event.operation_id,
        payload=event.payload,
    ).model_dump(mode="json", by_alias=True)


def _emit_after_commit(
    request: Request,
    playlist_id: UUID,
    event: dict[str, object],
) -> None:
    db = SessionLocal()
    try:
        def authorized(account_id: UUID) -> bool:
            playlist = get_playlist(db, playlist_id)
            return playlist is not None and can_read(db, playlist, account_id)

        def authorized_subscription(
            subscription: PlaylistSubscription,
        ) -> bool:
            auth_session = db.get(
                AuthSession,
                subscription.session_id,
                populate_existing=True,
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
            return authorized(subscription.account_id)

        _hub(request).publish(playlist_id, event, authorized_subscription)
    finally:
        db.close()


def _commit_and_emit(
    request: Request,
    db: Session,
    playlist_id: UUID,
    event: PlaylistEvent | None,
) -> None:
    event_value = _event_dict(event) if event is not None else None
    db.commit()
    if event_value is not None:
        _emit_after_commit(request, playlist_id, event_value)


def _emit_deletion_after_commit(
    request: Request,
    playlist_id: UUID,
    event: dict[str, object],
    authorized_account_ids: set[UUID],
) -> None:
    db = SessionLocal()
    try:
        def authorized(subscription: PlaylistSubscription) -> bool:
            if subscription.account_id not in authorized_account_ids:
                return False
            auth_session = db.get(
                AuthSession,
                subscription.session_id,
                populate_existing=True,
            )
            now = utc_now()
            return (
                auth_session is not None
                and auth_session.revoked_at is None
                and auth_session.access_expires_at > now
                and auth_session.absolute_expires_at > now
                and auth_session.access_token_digest
                == subscription.access_token_digest
            )

        _hub(request).publish_deletion(playlist_id, event, authorized)
    finally:
        db.close()


def _encode_cursor(after_id: UUID, query: str | None) -> str:
    from app.playlists.service import request_fingerprint

    fingerprint = request_fingerprint("playlist-list", {"query": query})
    payload = f"v1\n{fingerprint}\n{after_id}".encode("ascii")
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str, query: str | None) -> UUID:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        decoded = base64.b64decode(
            padded.encode("ascii"), altchars=b"-_", validate=True
        ).decode("ascii")
        version, fingerprint, after_id = decoded.split("\n")
        expected = request_fingerprint("playlist-list", {"query": query})
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
            "The pagination cursor is invalid for this playlist search.",
        ) from exc


def _load_owned_invitation(
    db: Session,
    invitation_id: UUID,
    account_id: UUID,
) -> PlaylistInvitation:
    invitation = db.scalar(
        select(PlaylistInvitation).where(
            PlaylistInvitation.id == invitation_id,
            PlaylistInvitation.invitee_account_id == account_id,
        )
    )
    if invitation is None:
        raise not_found()
    return invitation


@router.post("", response_model=PlaylistResponse, status_code=201)
def create_playlist(
    body: PlaylistCreate,
    request: Request,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistResponse:
    owner_id = principal.account.id
    lock_account = db.scalar(
        select(Account).where(Account.id == owner_id).with_for_update()
    )
    if lock_account is None:
        raise not_found()
    normalized = body.model_dump(mode="json", by_alias=True)
    fingerprint = request_fingerprint("playlist.create", normalized)
    previous = db.scalar(
        select(Playlist).where(
            Playlist.owner_account_id == owner_id,
            Playlist.creation_operation_id == body.operation_id,
        )
    )
    if previous is not None:
        if previous.creation_fingerprint != fingerprint:
            raise APIError(
                409,
                "IDEMPOTENCY_CONFLICT",
                "The operation ID was already used for a different request.",
            )
        response = playlist_response(db, previous, owner_id)
        db.commit()
        return response
    if body.edit_policy == "collaborators" and not can_use_invited_edit_policy(
        db, owner_id
    ):
        raise APIError(
            403,
            "LICENSE_REQUIRED",
            "A playlist collaboration license is required for invited-only editing.",
        )

    playlist = Playlist(
        owner_account_id=owner_id,
        name=body.name,
        description=body.description,
        visibility=body.visibility,
        edit_policy=body.edit_policy,
        revision=1,
        creation_operation_id=body.operation_id,
        creation_fingerprint=fingerprint,
    )
    db.add(playlist)
    db.flush()
    event = PlaylistEvent(
        playlist_id=playlist.id,
        revision=1,
        event_type="playlist.created",
        operation_id=body.operation_id,
        payload={},
    )
    db.add(event)
    db.flush()
    response = playlist_response(db, playlist, owner_id)
    _commit_and_emit(request, db, playlist.id, event)
    return response


@router.get("", response_model=PlaylistListResponse)
def list_playlists(
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=_PAGE_SIZE_MAX)] = _PAGE_SIZE_DEFAULT,
    cursor: Annotated[str | None, Query(max_length=256)] = None,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistListResponse:
    query = " ".join(q.split()).casefold() if q and q.strip() else None
    after_id = _decode_cursor(cursor, query) if cursor is not None else None
    rows, has_more = list_visible_playlists(
        db,
        principal.account.id,
        query=query,
        after_id=after_id,
        limit=limit,
    )
    next_cursor = _encode_cursor(rows[-1].id, query) if has_more else None
    return PlaylistListResponse(
        items=[playlist_response(db, row, principal.account.id) for row in rows],
        next_cursor=next_cursor,
    )


@router.get("/invitations", response_model=PlaylistInvitationListResponse)
def list_playlist_invitations(
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistInvitationListResponse:
    invitations = db.scalars(
        select(PlaylistInvitation)
        .join(Playlist, Playlist.id == PlaylistInvitation.playlist_id)
        .where(
            PlaylistInvitation.invitee_account_id == principal.account.id,
            PlaylistInvitation.status == "pending",
        )
        .order_by(PlaylistInvitation.created_at.desc(), PlaylistInvitation.id.desc())
    ).all()
    return PlaylistInvitationListResponse(
        items=[invitation_response(invitation) for invitation in invitations]
    )


@router.get("/{playlistId}", response_model=PlaylistResponse)
def get_playlist_snapshot(
    playlist_id: UUID = Path(alias="playlistId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistResponse:
    playlist = require_playlist_read(db, playlist_id, principal.account.id)
    return playlist_response(db, playlist, principal.account.id)


@router.patch("/{playlistId}", response_model=PlaylistResponse)
def update_playlist(
    body: PlaylistUpdate,
    request: Request,
    playlist_id: UUID = Path(alias="playlistId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistResponse:
    playlist = lock_and_authorize_editor(
        db, playlist_id, principal.account.id, manage=True
    )
    values = body.model_dump(mode="json", by_alias=True, exclude_unset=True)
    fingerprint = request_fingerprint("playlist.update", values)
    previous = check_idempotency(
        db,
        playlist,
        principal.account.id,
        body.operation_id,
        fingerprint,
    )
    if previous is not None:
        response = playlist_response(db, playlist, principal.account.id)
        db.commit()
        return response
    assert_expected_revision(playlist, body.expected_revision)
    if body.edit_policy == "collaborators" and not can_use_invited_edit_policy(
        db, principal.account.id
    ):
        raise APIError(
            403,
            "LICENSE_REQUIRED",
            "A playlist collaboration license is required for invited-only editing.",
        )
    for field in ("name", "description", "visibility", "edit_policy"):
        value = getattr(body, field)
        if value is not None:
            setattr(playlist, field, value)
    operation, event = begin_operation(
        db,
        playlist,
        actor_id=principal.account.id,
        expected_revision=body.expected_revision,
        operation_id=body.operation_id,
        fingerprint=fingerprint,
        event_type="playlist.updated",
        payload={},
    )
    if operation is not None:
        response = playlist_response(db, playlist, principal.account.id)
        db.commit()
        return response
    response = playlist_response(db, playlist, principal.account.id)
    _commit_and_emit(request, db, playlist.id, event)
    return response


@router.post("/{playlistId}/entries", response_model=PlaylistResponse)
def add_playlist_entries(
    body: AddEntries,
    request: Request,
    playlist_id: UUID = Path(alias="playlistId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistResponse:
    playlist = lock_and_authorize_editor(db, playlist_id, principal.account.id)
    fingerprint = request_fingerprint(
        "playlist.entries.add", body.model_dump(mode="json", by_alias=True)
    )
    previous = check_idempotency(
        db, playlist, principal.account.id, body.operation_id, fingerprint
    )
    if previous is None:
        assert_expected_revision(playlist, body.expected_revision)
        add_entries(db, playlist, actor_id=principal.account.id, song_ids=body.song_ids)
    _, event = begin_operation(
        db,
        playlist,
        actor_id=principal.account.id,
        expected_revision=body.expected_revision,
        operation_id=body.operation_id,
        fingerprint=fingerprint,
        event_type="playlist.updated",
        payload={"change": "entries"},
    )
    response = playlist_response(db, playlist, principal.account.id)
    if event is not None:
        _commit_and_emit(request, db, playlist.id, event)
    else:
        db.commit()
    return response


@router.delete(
    "/{playlistId}/entries/{entryId}", response_model=PlaylistResponse
)
def remove_playlist_entry(
    body: PlaylistMutation,
    request: Request,
    playlist_id: UUID = Path(alias="playlistId"),
    entry_id: UUID = Path(alias="entryId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistResponse:
    playlist = lock_and_authorize_editor(db, playlist_id, principal.account.id)
    data = {
        "expectedRevision": body.expected_revision,
        "operationId": str(body.operation_id),
        "entryId": str(entry_id),
    }
    fingerprint = request_fingerprint("playlist.entries.remove", data)
    previous = check_idempotency(
        db, playlist, principal.account.id, body.operation_id, fingerprint
    )
    if previous is None:
        assert_expected_revision(playlist, body.expected_revision)
        remove_entry(db, playlist, entry_id)
    _, event = begin_operation(
        db,
        playlist,
        actor_id=principal.account.id,
        expected_revision=body.expected_revision,
        operation_id=body.operation_id,
        fingerprint=fingerprint,
        event_type="playlist.updated",
        payload={"change": "entries"},
    )
    response = playlist_response(db, playlist, principal.account.id)
    if event is not None:
        _commit_and_emit(request, db, playlist.id, event)
    else:
        db.commit()
    return response


@router.put("/{playlistId}/entries/order", response_model=PlaylistResponse)
def reorder_playlist_entries(
    body: ReorderEntries,
    request: Request,
    playlist_id: UUID = Path(alias="playlistId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistResponse:
    playlist = lock_and_authorize_editor(db, playlist_id, principal.account.id)
    fingerprint = request_fingerprint(
        "playlist.entries.reorder", body.model_dump(mode="json", by_alias=True)
    )
    previous = check_idempotency(
        db, playlist, principal.account.id, body.operation_id, fingerprint
    )
    if previous is None:
        assert_expected_revision(playlist, body.expected_revision)
        reorder_entries(db, playlist, body.entry_ids)
    _, event = begin_operation(
        db,
        playlist,
        actor_id=principal.account.id,
        expected_revision=body.expected_revision,
        operation_id=body.operation_id,
        fingerprint=fingerprint,
        event_type="playlist.updated",
        payload={"change": "entries"},
    )
    response = playlist_response(db, playlist, principal.account.id)
    if event is not None:
        _commit_and_emit(request, db, playlist.id, event)
    else:
        db.commit()
    return response


@router.post(
    "/{playlistId}/invitations",
    response_model=PlaylistInvitationResponse,
    status_code=201,
)
def invite_to_playlist(
    body: PlaylistInvitationCreate,
    request: Request,
    playlist_id: UUID = Path(alias="playlistId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistInvitationResponse:
    playlist = lock_and_authorize_editor(
        db, playlist_id, principal.account.id, manage=True
    )
    data = body.model_dump(mode="json", by_alias=True)
    fingerprint = request_fingerprint("playlist.invitation.create", data)
    previous = check_idempotency(
        db, playlist, principal.account.id, body.operation_id, fingerprint
    )
    if previous is not None:
        invitation = (
            db.get(PlaylistInvitation, previous.result_resource_id)
            if previous.result_resource_id is not None
            else None
        )
        if invitation is None:
            raise RuntimeError("Stored invitation operation has no invitation")
        db.commit()
        return invitation_response(invitation)
    if body.invitee_account_id == principal.account.id:
        raise APIError(422, "INVALID_INVITEE", "An owner cannot invite themselves.")
    assert_expected_revision(playlist, body.expected_revision)
    if lookup_account(db, body.invitee_account_id) is None:
        raise not_found()
    active = db.scalar(
        select(PlaylistInvitation).where(
            PlaylistInvitation.playlist_id == playlist.id,
            PlaylistInvitation.invitee_account_id == body.invitee_account_id,
            PlaylistInvitation.status.in_(("pending", "accepted")),
        )
    )
    if active is not None:
        raise APIError(
            409,
            "INVITATION_EXISTS",
            "This account already has an active playlist invitation.",
        )
    invitation = PlaylistInvitation(
        playlist_id=playlist.id,
        invitee_account_id=body.invitee_account_id,
        inviter_account_id=principal.account.id,
        status="pending",
    )
    db.add(invitation)
    db.flush()
    _, event = begin_operation(
        db,
        playlist,
        actor_id=principal.account.id,
        expected_revision=body.expected_revision,
        operation_id=body.operation_id,
        fingerprint=fingerprint,
        event_type="playlist.invitation.updated",
        payload={"change": "invitation"},
        result_resource_id=invitation.id,
    )
    create_notification(
        db,
        recipient_account_id=body.invitee_account_id,
        producer_event_id=body.operation_id,
        kind="playlist_invitation",
        actor_account_id=principal.account.id,
        destination=DestinationReference("playlist", playlist.id),
    )
    response = invitation_response(invitation)
    _commit_and_emit(request, db, playlist.id, event)
    return response


@router.post(
    "/invitations/{invitationId}/respond",
    response_model=PlaylistInvitationResponse,
)
def respond_to_playlist_invitation(
    body: PlaylistInvitationRespond,
    request: Request,
    invitation_id: UUID = Path(alias="invitationId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistInvitationResponse:
    initial = _load_owned_invitation(db, invitation_id, principal.account.id)
    playlist = get_playlist(db, initial.playlist_id, lock=True)
    if playlist is None:
        raise not_found()
    invitation = _load_owned_invitation(db, invitation_id, principal.account.id)
    data = {
        **body.model_dump(mode="json", by_alias=True),
        "invitationId": str(invitation_id),
    }
    fingerprint = request_fingerprint("playlist.invitation.respond", data)
    previous = check_idempotency(
        db, playlist, principal.account.id, body.operation_id, fingerprint
    )
    if previous is None:
        if invitation.status != "pending":
            raise APIError(
                409,
                "INVITATION_NOT_PENDING",
                "This playlist invitation is no longer pending.",
            )
        assert_expected_revision(playlist, body.expected_revision)
        operation, event = begin_operation(
            db,
            playlist,
            actor_id=principal.account.id,
            expected_revision=body.expected_revision,
            operation_id=body.operation_id,
            fingerprint=fingerprint,
            event_type="playlist.invitation.updated",
            payload={"change": "invitation"},
        )
        if operation is not None:
            response = invitation_response(invitation)
            db.commit()
            return response
        invitation.status = body.response
        invitation.updated_at = utc_now()
        create_notification(
            db,
            recipient_account_id=playlist.owner_account_id,
            producer_event_id=body.operation_id,
            kind="playlist_updated",
            actor_account_id=principal.account.id,
            destination=DestinationReference("playlist", playlist.id),
        )
    else:
        event = None
    response = invitation_response(invitation)
    if event is not None:
        _commit_and_emit(request, db, playlist.id, event)
    else:
        db.commit()
    return response


@router.delete(
    "/{playlistId}/invitations/{invitationId}",
    response_model=PlaylistInvitationResponse,
)
def revoke_playlist_invitation(
    body: PlaylistMutation,
    request: Request,
    playlist_id: UUID = Path(alias="playlistId"),
    invitation_id: UUID = Path(alias="invitationId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistInvitationResponse:
    playlist = lock_and_authorize_editor(
        db, playlist_id, principal.account.id, manage=True
    )
    invitation = db.scalar(
        select(PlaylistInvitation)
        .where(
            PlaylistInvitation.id == invitation_id,
            PlaylistInvitation.playlist_id == playlist.id,
        )
        .with_for_update()
    )
    if invitation is None:
        raise not_found()
    fingerprint = request_fingerprint(
        "playlist.invitation.revoke",
        {
            "expectedRevision": body.expected_revision,
            "operationId": str(body.operation_id),
            "invitationId": str(invitation_id),
        },
    )
    previous = check_idempotency(
        db, playlist, principal.account.id, body.operation_id, fingerprint
    )
    if previous is None:
        if invitation.status not in {"pending", "accepted"}:
            raise APIError(
                409,
                "INVITATION_NOT_ACTIVE",
                "This playlist invitation is no longer active.",
            )
        assert_expected_revision(playlist, body.expected_revision)
        _, event = begin_operation(
            db,
            playlist,
            actor_id=principal.account.id,
            expected_revision=body.expected_revision,
            operation_id=body.operation_id,
            fingerprint=fingerprint,
            event_type="playlist.invitation.updated",
            payload={"change": "invitation"},
        )
        invitation.status = "revoked"
        invitation.updated_at = utc_now()
        create_notification(
            db,
            recipient_account_id=invitation.invitee_account_id,
            producer_event_id=body.operation_id,
            kind="playlist_invitation",
            actor_account_id=principal.account.id,
            destination=DestinationReference("playlist", playlist.id),
        )
    else:
        event = None
    response = invitation_response(invitation)
    if event is not None:
        _commit_and_emit(request, db, playlist.id, event)
    else:
        db.commit()
    return response


@router.delete("/{playlistId}", response_model=PlaylistDeleteResponse)
def delete_playlist(
    body: PlaylistMutation,
    request: Request,
    playlist_id: UUID = Path(alias="playlistId"),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> PlaylistDeleteResponse:
    fingerprint = request_fingerprint(
        "playlist.delete", body.model_dump(mode="json", by_alias=True)
    )
    prior_deletion = db.scalar(
        select(PlaylistDeletion).where(
            PlaylistDeletion.playlist_id == playlist_id,
            PlaylistDeletion.owner_account_id == principal.account.id,
            PlaylistDeletion.operation_id == body.operation_id,
        )
    )
    if prior_deletion is not None:
        if prior_deletion.request_fingerprint != fingerprint:
            raise APIError(
                409,
                "IDEMPOTENCY_CONFLICT",
                "The operation ID was already used for a different request.",
            )
        return PlaylistDeleteResponse(
            deleted=True,
            revision=str(prior_deletion.result_revision),
        )
    playlist = lock_and_authorize_editor(
        db, playlist_id, principal.account.id, manage=True
    )
    previous = check_idempotency(
        db, playlist, principal.account.id, body.operation_id, fingerprint
    )
    if previous is not None:
        db.commit()
        return PlaylistDeleteResponse(deleted=True, revision=str(playlist.revision))
    if int(body.expected_revision) != playlist.revision:
        raise APIError(
            409,
            "REVISION_CONFLICT",
            "The playlist changed. Fetch the latest snapshot and retry.",
            details={"currentRevision": str(playlist.revision)},
        )
    deleted_revision = playlist.revision + 1
    now = utc_now()
    deletion_event = PlaylistEventResponse(
        event_id=uuid4(),
        type="playlist.deleted",
        resource_id=playlist.id,
        revision=str(deleted_revision),
        occurred_at=now,
        operation_id=body.operation_id,
        payload={},
    ).model_dump(mode="json", by_alias=True)
    subscribed_accounts = _hub(request).subscribed_accounts(playlist_id)
    authorized_accounts = {
        account_id
        for account_id in subscribed_accounts
        if can_read(db, playlist, account_id)
    }
    db.add(
        PlaylistDeletion(
            playlist_id=playlist.id,
            owner_account_id=principal.account.id,
            operation_id=body.operation_id,
            request_fingerprint=fingerprint,
            result_revision=deleted_revision,
        )
    )
    db.delete(playlist)
    db.commit()
    _emit_deletion_after_commit(
        request,
        playlist_id,
        deletion_event,
        authorized_accounts,
    )
    return PlaylistDeleteResponse(deleted=True, revision=str(deleted_revision))


def _websocket_credentials(
    websocket: WebSocket,
    db: Session,
) -> tuple[UUID, UUID, str] | None:
    authorization = websocket.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token or len(token) > 128:
        return None
    digest = keyed_digest(websocket.app.state.settings, "access-token", token.strip())
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


@router.websocket("/{playlistId}/events")
async def playlist_events(
    websocket: WebSocket,
    playlist_id: UUID = Path(alias="playlistId"),
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
        playlist = get_playlist(db, playlist_id)
        if playlist is None or not can_read(db, playlist, account_id):
            await websocket.close(code=4404)
            return

    hub: PlaylistEventHub = websocket.app.state.playlist_event_hub
    subscription = hub.subscribe(
        playlist_id,
        account_id,
        session_id,
        access_token_digest,
        int(after_revision) if after_revision is not None else 0,
    )
    await websocket.accept()
    try:
        with SessionLocal() as db:
            playlist = get_playlist(db, playlist_id)
            if playlist is None or not can_read(db, playlist, account_id):
                await websocket.close(code=4404)
                return
            current_revision = playlist.revision
        hub.set_revision(subscription, current_revision)
        if after_revision is None or int(after_revision) != current_revision:
            await websocket.send_json(
                {
                    "eventId": str(uuid4()),
                    "type": "playlist.resync_required",
                    "resourceType": "playlist",
                    "resourceId": str(playlist_id),
                    "revision": str(current_revision),
                    "occurredAt": datetime.now(UTC).isoformat(),
                    "operationId": None,
                    "payload": {"reason": "revision_gap"},
                }
            )
        next_heartbeat = monotonic() + 25
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
            if monotonic() >= next_heartbeat:
                with SessionLocal() as db:
                    auth_session = db.get(AuthSession, session_id)
                    if (
                        auth_session is None
                        or auth_session.revoked_at is not None
                        or auth_session.access_expires_at <= utc_now()
                        or auth_session.absolute_expires_at <= utc_now()
                        or auth_session.access_token_digest != access_token_digest
                    ):
                        await websocket.close(code=4401)
                        return
                await websocket.send_json({"type": "heartbeat"})
                next_heartbeat = monotonic() + 25
    except WebSocketDisconnect:
        return
    finally:
        hub.unsubscribe(subscription)
