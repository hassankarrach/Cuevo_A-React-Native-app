from datetime import UTC, datetime
from io import BytesIO
import warnings
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy import case, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.errors import APIError, FieldError
from app.auth.dependencies import Principal, current_principal
from app.auth.models import Account
from app.db.session import get_db
from app.profiles.models import Friendship, Profile, ProfileAvatar
from app.profiles.schemas import (
    AvatarResponse,
    FriendListItem,
    FriendListResponse,
    FriendRequestCreate,
    FriendRequestResponse,
    MusicPreferencesUpdate,
    PrivacyUpdate,
    ProfilePermissions,
    ProfileResponse,
    ProfileUpdate,
    RelationshipResponse,
)


router = APIRouter(prefix="/api/v1", tags=["profiles", "friendships"])
MAX_AVATAR_BYTES = 2 * 1024 * 1024
AVATAR_CONTENT_TYPES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}
RelationshipStatus = Literal[
    "self",
    "friends",
    "outgoing_pending",
    "incoming_pending",
    "none",
]


def _not_found() -> APIError:
    return APIError(404, "NOT_FOUND", "The requested resource was not found.")


def _relationship(
    db: Session,
    first_account_id: UUID,
    second_account_id: UUID,
) -> Friendship | None:
    low, high = sorted((first_account_id, second_account_id))
    return db.scalar(
        select(Friendship).where(
            Friendship.account_low == low,
            Friendship.account_high == high,
        )
    )


def _relationship_status(
    db: Session,
    viewer_id: UUID,
    account_id: UUID,
) -> RelationshipStatus:
    if viewer_id == account_id:
        return "self"
    relationship = _relationship(db, viewer_id, account_id)
    if relationship is None:
        return "none"
    if relationship.status == "friends":
        return "friends"
    if relationship.requester_account_id == viewer_id:
        return "outgoing_pending"
    return "incoming_pending"


def _can_read_avatar(
    db: Session,
    viewer_id: UUID,
    profile: Profile,
) -> bool:
    if viewer_id == profile.account_id or profile.privacy == "public":
        return True
    return (
        profile.privacy == "friends"
        and _relationship_status(db, viewer_id, profile.account_id) == "friends"
    )


def _avatar_url(account_id: UUID) -> str:
    return f"/api/v1/profiles/{account_id}/avatar"


def _profile_response(
    db: Session,
    viewer_id: UUID,
    profile: Profile,
) -> ProfileResponse:
    relationship_status = _relationship_status(db, viewer_id, profile.account_id)
    is_owner = relationship_status == "self"
    can_read_avatar = _can_read_avatar(db, viewer_id, profile)
    can_view_private_fields = (
        is_owner
        or profile.privacy == "public"
        or (profile.privacy == "friends" and relationship_status == "friends")
    )
    fields: dict[str, object] = {
        "account_id": profile.account_id,
        "display_name": profile.display_name,
        "username": profile.username,
        "privacy": profile.privacy,
        "relationship_status": relationship_status,
        "avatar_url": (
            _avatar_url(profile.account_id)
            if can_read_avatar and db.get(ProfileAvatar, profile.account_id) is not None
            else None
        ),
        "permissions": ProfilePermissions(
            can_edit=is_owner,
            can_view_private_fields=can_view_private_fields,
            can_request_friendship=relationship_status == "none",
            can_respond_to_friend_request=relationship_status == "incoming_pending",
            can_remove_friend=relationship_status == "friends",
        ),
    }
    if can_view_private_fields:
        fields.update(
            bio=profile.bio,
            location=profile.location,
            preferred_genres=list(profile.preferred_genres),
        )
    return ProfileResponse(**fields)


async def _read_avatar_upload(request: Request) -> tuple[str, bytes]:
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type not in AVATAR_CONTENT_TYPES.values():
        raise APIError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Upload a JPEG, PNG, or WebP image.",
        )

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > MAX_AVATAR_BYTES:
                raise APIError(
                    413,
                    "AVATAR_TOO_LARGE",
                    "Avatar images must be 2 MiB or smaller.",
                )
        except ValueError as exc:
            raise APIError(400, "BAD_REQUEST", "The request could not be processed.") from exc

    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_AVATAR_BYTES:
            raise APIError(
                413,
                "AVATAR_TOO_LARGE",
                "Avatar images must be 2 MiB or smaller.",
            )
        body.extend(chunk)
    if not body:
        raise APIError(415, "INVALID_AVATAR", "The uploaded image is not valid.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(body)) as image:
                detected_content_type = AVATAR_CONTENT_TYPES.get(image.format or "")
                image.verify()
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        UnidentifiedImageError,
    ) as exc:
        raise APIError(415, "INVALID_AVATAR", "The uploaded image is not valid.") from exc

    if detected_content_type != content_type:
        raise APIError(
            415,
            "INVALID_AVATAR",
            "The declared content type does not match the uploaded image.",
        )
    return content_type, bytes(body)


def _lock_account_pair(
    db: Session,
    viewer_id: UUID,
    other_id: UUID,
) -> None:
    locked_ids = set(
        db.scalars(
            select(Account.id)
            .where(Account.id.in_(sorted({viewer_id, other_id})))
            .order_by(Account.id)
            .with_for_update()
        ).all()
    )
    if other_id not in locked_ids:
        raise _not_found()


def _locked_request(
    db: Session,
    viewer_id: UUID,
    request_id: UUID,
) -> Friendship:
    existing = db.get(Friendship, request_id)
    if existing is None:
        raise _not_found()
    if viewer_id == existing.account_low:
        other_id = existing.account_high
    elif viewer_id == existing.account_high:
        other_id = existing.account_low
    else:
        raise _not_found()
    _lock_account_pair(db, viewer_id, other_id)
    relationship = db.scalar(
        select(Friendship)
        .where(Friendship.id == request_id)
        .with_for_update()
    )
    if relationship is None:
        raise _not_found()
    return relationship


def _friend_list(
    db: Session,
    viewer_id: UUID,
    *,
    kind: Literal["friends", "incoming", "outgoing"],
    cursor: UUID | None,
    limit: int,
) -> FriendListResponse:
    peer_id = case(
        (Friendship.account_low == viewer_id, Friendship.account_high),
        else_=Friendship.account_low,
    )
    statement = (
        select(Friendship, Account, Profile)
        .join(Account, Account.id == peer_id)
        .outerjoin(Profile, Profile.account_id == peer_id)
    )
    if kind == "friends":
        statement = statement.where(Friendship.status == "friends")
    else:
        statement = statement.where(
            Friendship.status == "pending",
            Friendship.requester_account_id
            == (viewer_id if kind == "outgoing" else peer_id),
        )
    statement = statement.where(
        (Friendship.account_low == viewer_id)
        | (Friendship.account_high == viewer_id)
    )
    if cursor is not None:
        statement = statement.where(peer_id > cursor)
    rows = db.execute(statement.order_by(peer_id).limit(limit + 1)).all()
    has_more = len(rows) > limit
    page = rows[:limit]
    items = [
        FriendListItem(
            id=relationship.id,
            account_id=account.id,
            display_name=profile.display_name if profile is not None else None,
            username=profile.username if profile is not None else None,
            created_at=relationship.created_at,
        )
        for relationship, account, profile in page
    ]
    next_cursor = items[-1].account_id if has_more and items else None
    return FriendListResponse(items=items, next_cursor=next_cursor)


@router.get(
    "/me/profile",
    response_model=ProfileResponse,
    response_model_exclude_unset=True,
    responses={401: {"description": "Authentication required"}},
)
def read_my_profile(
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    profile = db.get(Profile, principal.account.id)
    if profile is None:
        raise _not_found()
    return _profile_response(db, principal.account.id, profile)


@router.put(
    "/me/avatar",
    response_model=AvatarResponse,
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "A profile is required before uploading an avatar"},
        413: {"description": "Avatar exceeds the 2 MiB size limit"},
        415: {"description": "Unsupported or invalid image"},
    },
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                content_type: {
                    "schema": {"type": "string", "format": "binary"}
                }
                for content_type in AVATAR_CONTENT_TYPES.values()
            },
        }
    },
)
async def upload_my_avatar(
    request: Request,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> AvatarResponse:
    profile = db.get(Profile, principal.account.id)
    if profile is None:
        raise _not_found()

    content_type, image_data = await _read_avatar_upload(request)
    avatar = db.get(ProfileAvatar, principal.account.id)
    if avatar is None:
        avatar = ProfileAvatar(
            account_id=principal.account.id,
            content_type=content_type,
            image_data=image_data,
        )
        db.add(avatar)
    else:
        avatar.content_type = content_type
        avatar.image_data = image_data
    db.flush()
    return AvatarResponse(avatar_url=_avatar_url(principal.account.id))


@router.delete(
    "/me/avatar",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"description": "Authentication required"}},
)
def delete_my_avatar(
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> Response:
    profile = db.get(Profile, principal.account.id)
    if profile is None:
        raise _not_found()
    avatar = db.get(ProfileAvatar, principal.account.id)
    if avatar is not None:
        db.delete(avatar)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/profiles/{account_id}/avatar",
    response_class=Response,
    responses={
        200: {
            "description": "Profile avatar image",
            "content": {
                content_type: {"schema": {"type": "string", "format": "binary"}}
                for content_type in AVATAR_CONTENT_TYPES.values()
            },
        },
        401: {"description": "Authentication required"},
        404: {"description": "Avatar unavailable or not visible to this viewer"},
    },
)
def read_profile_avatar(
    account_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> Response:
    profile = db.get(Profile, account_id)
    if profile is None or not _can_read_avatar(db, principal.account.id, profile):
        raise _not_found()
    avatar = db.get(ProfileAvatar, account_id)
    if avatar is None:
        raise _not_found()
    return Response(
        content=avatar.image_data,
        media_type=avatar.content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        },
    )


@router.patch(
    "/me/profile",
    response_model=ProfileResponse,
    response_model_exclude_unset=True,
    responses={
        401: {"description": "Authentication required"},
        409: {"description": "Username is already in use"},
    },
)
def update_my_profile(
    payload: ProfileUpdate,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    supplied = payload.model_fields_set
    if not supplied:
        raise APIError(
            422,
            "VALIDATION_ERROR",
            "At least one profile field must be provided.",
        )
    profile = db.get(Profile, principal.account.id)
    if "display_name" in supplied and payload.display_name is None:
        raise APIError(
            422,
            "VALIDATION_ERROR",
            "Display name cannot be empty.",
            field_errors=[
                FieldError(
                    field="displayName",
                    code="required",
                    message="A display name cannot be empty.",
                )
            ],
        )
    if "username" in supplied and payload.username is None:
        raise APIError(
            422,
            "VALIDATION_ERROR",
            "Username cannot be empty.",
            field_errors=[
                FieldError(
                    field="username",
                    code="required",
                    message="A username cannot be empty.",
                )
            ],
        )
    if profile is None:
        if (
            "display_name" not in supplied
            or "username" not in supplied
            or payload.display_name is None
            or payload.username is None
        ):
            raise APIError(
                422,
                "VALIDATION_ERROR",
                "Creating a profile requires displayName and username.",
                field_errors=[
                    FieldError(
                        field="displayName",
                        code="required",
                        message="A display name is required when creating a profile.",
                    ),
                    FieldError(
                        field="username",
                        code="required",
                        message="A username is required when creating a profile.",
                    ),
                ],
            )

    candidate_username = (
        payload.username
        if "username" in supplied
        else profile.username if profile is not None else None
    )
    if candidate_username is not None:
        conflicting_id = db.scalar(
            select(Profile.account_id).where(
                Profile.username == candidate_username,
                Profile.account_id != principal.account.id,
            )
        )
        if conflicting_id is not None:
            raise APIError(
                409,
                "USERNAME_UNAVAILABLE",
                "That username is unavailable.",
            )
    if profile is None:
        profile = Profile(
            account_id=principal.account.id,
            display_name=payload.display_name,
            username=payload.username,
            bio=payload.bio,
            location=payload.location,
        )
        db.add(profile)
    else:
        for field in ("display_name", "username", "bio", "location"):
            if field in supplied:
                setattr(profile, field, getattr(payload, field))
    try:
        db.flush()
    except IntegrityError as exc:
        constraint_name = getattr(
            getattr(exc.orig, "diag", None),
            "constraint_name",
            None,
        )
        if constraint_name != "uq_profiles_username":
            raise
        db.rollback()
        raise APIError(
            409,
            "USERNAME_UNAVAILABLE",
            "That username is unavailable.",
        ) from exc
    return _profile_response(db, principal.account.id, profile)


@router.patch(
    "/me/privacy",
    response_model=ProfileResponse,
    response_model_exclude_unset=True,
    responses={401: {"description": "Authentication required"}},
)
def update_my_privacy(
    payload: PrivacyUpdate,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    profile = db.get(Profile, principal.account.id)
    if profile is None:
        raise _not_found()
    profile.privacy = payload.privacy
    return _profile_response(db, principal.account.id, profile)


@router.put(
    "/me/music-preferences",
    response_model=ProfileResponse,
    response_model_exclude_unset=True,
    responses={401: {"description": "Authentication required"}},
)
def update_music_preferences(
    payload: MusicPreferencesUpdate,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    profile = db.get(Profile, principal.account.id)
    if profile is None:
        raise _not_found()
    profile.preferred_genres = payload.preferred_genres
    return _profile_response(db, principal.account.id, profile)


@router.get(
    "/profiles/{account_id}",
    response_model=ProfileResponse,
    response_model_exclude_unset=True,
    responses={401: {"description": "Authentication required"}},
)
def read_profile(
    account_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    profile = db.get(Profile, account_id)
    if profile is None:
        raise _not_found()
    return _profile_response(db, principal.account.id, profile)


@router.get(
    "/friends/{account_id}/relationship",
    response_model=RelationshipResponse,
    responses={401: {"description": "Authentication required"}},
)
def read_relationship(
    account_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> RelationshipResponse:
    return RelationshipResponse(
        account_id=account_id,
        status=_relationship_status(db, principal.account.id, account_id),
    )


@router.post(
    "/friend-requests",
    response_model=FriendRequestResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"description": "Authentication required"},
        409: {"description": "Request already exists or accounts are already friends"},
    },
)
def create_friend_request(
    payload: FriendRequestCreate,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> FriendRequestResponse:
    viewer_id = principal.account.id
    other_id = payload.target_account_id
    if viewer_id == other_id:
        raise APIError(422, "INVALID_FRIEND_TARGET", "You cannot add yourself as a friend.")
    _lock_account_pair(db, viewer_id, other_id)
    low, high = sorted((viewer_id, other_id))
    relationship = db.scalar(
        select(Friendship)
        .where(
            Friendship.account_low == low,
            Friendship.account_high == high,
        )
        .with_for_update()
    )
    now = datetime.now(UTC)
    if relationship is None:
        relationship = Friendship(
            account_low=low,
            account_high=high,
            requester_account_id=viewer_id,
            status="pending",
        )
        db.add(relationship)
        db.flush()
    elif relationship.status == "friends":
        raise APIError(409, "ALREADY_FRIENDS", "These accounts are already friends.")
    elif relationship.requester_account_id == viewer_id:
        raise APIError(409, "FRIEND_REQUEST_EXISTS", "A request is already pending.")
    else:
        relationship.status = "friends"
        relationship.accepted_at = now
    return FriendRequestResponse(
        id=relationship.id,
        account_id=other_id,
        status=_relationship_status(db, viewer_id, other_id),
        created_at=relationship.created_at,
    )


def _respond_to_request(
    db: Session,
    viewer_id: UUID,
    request_id: UUID,
    *,
    action: Literal["accept", "decline", "cancel"],
) -> FriendRequestResponse:
    relationship = _locked_request(db, viewer_id, request_id)
    if relationship.status != "pending":
        raise APIError(409, "FRIEND_REQUEST_NOT_PENDING", "The request is no longer pending.")
    is_requester = relationship.requester_account_id == viewer_id
    if (action == "cancel") != is_requester:
        raise APIError(403, "FORBIDDEN", "You are not allowed to perform this action.")
    if action == "accept" and is_requester:
        raise APIError(403, "FORBIDDEN", "Only the recipient can accept this request.")
    if action == "decline" and is_requester:
        raise APIError(403, "FORBIDDEN", "Only the recipient can decline this request.")

    other_id = (
        relationship.account_high
        if relationship.account_low == viewer_id
        else relationship.account_low
    )
    if action == "accept":
        relationship.status = "friends"
        relationship.accepted_at = datetime.now(UTC)
        result_status = "friends"
    else:
        db.delete(relationship)
        result_status = "none"
    return FriendRequestResponse(
        id=relationship.id,
        account_id=other_id,
        status=result_status,
        created_at=relationship.created_at,
    )


@router.post(
    "/friend-requests/{request_id}/accept",
    response_model=FriendRequestResponse,
    responses={
        401: {"description": "Authentication required"},
        403: {"description": "Only the recipient may accept"},
        404: {"description": "Request not found"},
        409: {"description": "Request is no longer pending"},
    },
)
def accept_friend_request(
    request_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> FriendRequestResponse:
    return _respond_to_request(
        db,
        principal.account.id,
        request_id,
        action="accept",
    )


@router.post(
    "/friend-requests/{request_id}/decline",
    response_model=FriendRequestResponse,
    responses={
        401: {"description": "Authentication required"},
        403: {"description": "Only the recipient may decline"},
        404: {"description": "Request not found"},
        409: {"description": "Request is no longer pending"},
    },
)
def decline_friend_request(
    request_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> FriendRequestResponse:
    return _respond_to_request(
        db,
        principal.account.id,
        request_id,
        action="decline",
    )


@router.post(
    "/friend-requests/{request_id}/cancel",
    response_model=FriendRequestResponse,
    responses={
        401: {"description": "Authentication required"},
        403: {"description": "Only the requester may cancel"},
        404: {"description": "Request not found"},
        409: {"description": "Request is no longer pending"},
    },
)
def cancel_friend_request(
    request_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> FriendRequestResponse:
    return _respond_to_request(
        db,
        principal.account.id,
        request_id,
        action="cancel",
    )


@router.delete(
    "/friends/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Friendship not found"},
    },
)
def remove_friend(
    account_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> Response:
    viewer_id = principal.account.id
    if viewer_id == account_id:
        raise _not_found()
    _lock_account_pair(db, viewer_id, account_id)
    relationship = db.scalar(
        select(Friendship)
        .where(
            Friendship.account_low == min(viewer_id, account_id),
            Friendship.account_high == max(viewer_id, account_id),
            Friendship.status == "friends",
        )
        .with_for_update()
    )
    if relationship is None:
        raise APIError(404, "FRIENDSHIP_NOT_FOUND", "The friendship was not found.")
    db.delete(relationship)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/friends", response_model=FriendListResponse)
def list_friends(
    cursor: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> FriendListResponse:
    return _friend_list(
        db,
        principal.account.id,
        kind="friends",
        cursor=cursor,
        limit=limit,
    )


@router.get("/friend-requests/incoming", response_model=FriendListResponse)
def list_incoming_requests(
    cursor: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> FriendListResponse:
    return _friend_list(
        db,
        principal.account.id,
        kind="incoming",
        cursor=cursor,
        limit=limit,
    )


@router.get("/friend-requests/outgoing", response_model=FriendListResponse)
def list_outgoing_requests(
    cursor: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> FriendListResponse:
    return _friend_list(
        db,
        principal.account.id,
        kind="outgoing",
        cursor=cursor,
        limit=limit,
    )
