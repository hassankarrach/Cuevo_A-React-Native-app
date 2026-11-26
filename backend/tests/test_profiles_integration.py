from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session

from app.auth.email import InMemoryEmailDelivery
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db_engine
from app.main import create_app
from app.profiles.models import ProfileAvatar


MAX_AVATAR_BYTES = 2 * 1024 * 1024


def _image_bytes(image_format: str = "PNG") -> bytes:
    image = Image.new("RGB", (4, 4), (30, 80, 120))
    output = BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


@pytest.fixture
def profile_api():
    engine = get_db_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    delivery = InMemoryEmailDelivery()
    app = create_app(get_settings(), email_delivery=delivery)
    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield client, delivery
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def _create_user(
    client: TestClient,
    delivery: InMemoryEmailDelivery,
    email: str,
) -> tuple[str, dict[str, str]]:
    password = "profile-test-password"
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert registered.status_code == 201, registered.text
    challenge = registered.json()
    code = delivery.messages[-1].code
    verified = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": email,
            "challengeId": challenge["challengeId"],
            "code": code,
        },
    )
    assert verified.status_code == 200, verified.text
    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert logged_in.status_code == 200, logged_in.text
    return verified.json()["id"], {
        "Authorization": f"Bearer {logged_in.json()['accessToken']}"
    }


@pytest.mark.parametrize(
    ("privacy", "friend_can_view", "stranger_can_view"),
    [
        ("public", True, True),
        ("friends", True, False),
        ("private", False, False),
    ],
)
def test_profile_private_fields_follow_visibility_for_owner_friend_and_stranger(
    profile_api,
    privacy: str,
    friend_can_view: bool,
    stranger_can_view: bool,
) -> None:
    client, delivery = profile_api
    owner_id, owner_headers = _create_user(
        client, delivery, f"owner-{privacy}@example.com"
    )
    friend_id, friend_headers = _create_user(
        client, delivery, f"friend-{privacy}@example.com"
    )
    _stranger_id, stranger_headers = _create_user(
        client, delivery, f"stranger-{privacy}@example.com"
    )

    created = client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={
            "displayName": "Owner Profile",
            "username": f"owner_{privacy}",
            "bio": "private bio",
            "location": "Wellington",
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["privacy"] == "private"
    assert created.json()["bio"] == "private bio"
    assert client.put(
        "/api/v1/me/music-preferences",
        headers=owner_headers,
        json={"preferredGenres": ["Jazz", "Ambient"]},
    ).status_code == 200
    privacy_response = client.patch(
        "/api/v1/me/privacy",
        headers=owner_headers,
        json={"privacy": privacy},
    )
    assert privacy_response.status_code == 200, privacy_response.text

    request = client.post(
        "/api/v1/friend-requests",
        headers=friend_headers,
        json={"targetAccountId": owner_id},
    )
    assert request.status_code == 201, request.text
    accepted = client.post(
        f"/api/v1/friend-requests/{request.json()['id']}/accept",
        headers=owner_headers,
    )
    assert accepted.status_code == 200, accepted.text

    own = client.get("/api/v1/me/profile", headers=owner_headers)
    friend = client.get(f"/api/v1/profiles/{owner_id}", headers=friend_headers)
    stranger = client.get(f"/api/v1/profiles/{owner_id}", headers=stranger_headers)
    assert own.status_code == friend.status_code == stranger.status_code == 200
    assert {"bio", "location", "preferredGenres"} <= own.json().keys()
    assert ("bio" in friend.json()) is friend_can_view
    assert ("location" in friend.json()) is friend_can_view
    assert ("preferredGenres" in friend.json()) is friend_can_view
    assert ("bio" in stranger.json()) is stranger_can_view
    assert ("location" in stranger.json()) is stranger_can_view
    assert ("preferredGenres" in stranger.json()) is stranger_can_view
    for response in (friend.json(), stranger.json()):
        assert response["displayName"] == "Owner Profile"
        assert response["username"] == f"owner_{privacy}"
        assert response["privacy"] == privacy
        assert response["permissions"]["canEdit"] is False
    assert own.json()["permissions"]["canEdit"] is True
    assert own.json()["permissions"]["canViewPrivateFields"] is True
    if privacy == "friends":
        removed = client.delete(
            f"/api/v1/friends/{friend_id}",
            headers=owner_headers,
        )
        assert removed.status_code == 204
        after_unfriend = client.get(
            f"/api/v1/profiles/{owner_id}",
            headers=friend_headers,
        )
        assert after_unfriend.status_code == 200
        assert "bio" not in after_unfriend.json()
        assert after_unfriend.json()["relationshipStatus"] == "none"

    account_state = client.get("/api/v1/me", headers=owner_headers)
    assert account_state.status_code == 200
    assert account_state.json()["emailVerified"] is True
    assert account_state.json()["profileCompleted"] is False
    assert friend_id != owner_id


def test_friendship_request_lifecycle_crossed_requests_and_authorization(profile_api) -> None:
    client, delivery = profile_api
    alice_id, alice_headers = _create_user(client, delivery, "alice@example.com")
    bob_id, bob_headers = _create_user(client, delivery, "bob@example.com")
    carol_id, carol_headers = _create_user(client, delivery, "carol@example.com")

    first = client.post(
        "/api/v1/friend-requests",
        headers=alice_headers,
        json={"targetAccountId": bob_id},
    )
    assert first.status_code == 201
    request_id = first.json()["id"]
    assert first.json()["status"] == "outgoing_pending"
    assert client.post(
        "/api/v1/friend-requests",
        headers=alice_headers,
        json={"targetAccountId": bob_id},
    ).json()["error"]["code"] == "FRIEND_REQUEST_EXISTS"

    incoming = client.get(
        "/api/v1/friend-requests/incoming",
        headers=bob_headers,
    )
    outgoing = client.get(
        "/api/v1/friend-requests/outgoing",
        headers=alice_headers,
    )
    assert incoming.json()["items"][0]["accountId"] == alice_id
    assert outgoing.json()["items"][0]["accountId"] == bob_id
    assert client.post(
        f"/api/v1/friend-requests/{request_id}/accept",
        headers=carol_headers,
    ).status_code == 404
    assert client.post(
        f"/api/v1/friend-requests/{request_id}/accept",
        headers=alice_headers,
    ).status_code == 403
    assert client.post(
        f"/api/v1/friend-requests/{request_id}/decline",
        headers=alice_headers,
    ).status_code == 403
    assert client.post(
        f"/api/v1/friend-requests/{request_id}/cancel",
        headers=bob_headers,
    ).status_code == 403
    accepted = client.post(
        f"/api/v1/friend-requests/{request_id}/accept",
        headers=bob_headers,
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "friends"
    assert client.get(
        f"/api/v1/friends/{bob_id}/relationship",
        headers=alice_headers,
    ).json()["status"] == "friends"
    assert client.get("/api/v1/friends", headers=alice_headers).json()["items"][0][
        "accountId"
    ] == bob_id
    assert client.post(
        f"/api/v1/friend-requests/{request_id}/accept",
        headers=bob_headers,
    ).status_code == 409
    assert client.delete(
        f"/api/v1/friends/{bob_id}",
        headers=carol_headers,
    ).status_code == 404
    assert client.get(
        f"/api/v1/friends/{bob_id}/relationship",
        headers=alice_headers,
    ).json()["status"] == "friends"

    assert client.delete(f"/api/v1/friends/{bob_id}", headers=alice_headers).status_code == 204
    assert client.get(
        f"/api/v1/friends/{bob_id}/relationship",
        headers=alice_headers,
    ).json()["status"] == "none"
    assert client.delete(f"/api/v1/friends/{bob_id}", headers=alice_headers).status_code == 404

    declined_request = client.post(
        "/api/v1/friend-requests",
        headers=bob_headers,
        json={"targetAccountId": alice_id},
    )
    assert client.post(
        f"/api/v1/friend-requests/{declined_request.json()['id']}/decline",
        headers=alice_headers,
    ).json()["status"] == "none"

    cancelled_request = client.post(
        "/api/v1/friend-requests",
        headers=alice_headers,
        json={"targetAccountId": bob_id},
    )
    assert client.post(
        f"/api/v1/friend-requests/{cancelled_request.json()['id']}/cancel",
        headers=alice_headers,
    ).json()["status"] == "none"

    assert client.post(
        "/api/v1/friend-requests",
        headers=alice_headers,
        json={"targetAccountId": carol_id},
    ).status_code == 201
    crossed = client.post(
        "/api/v1/friend-requests",
        headers=carol_headers,
        json={"targetAccountId": alice_id},
    )
    assert crossed.status_code == 201
    assert crossed.json()["status"] == "friends"
    assert client.get(
        f"/api/v1/friends/{carol_id}/relationship",
        headers=alice_headers,
    ).json()["status"] == "friends"


def test_profile_inputs_are_validated_and_actor_ids_are_never_client_controlled(
    profile_api,
) -> None:
    client, delivery = profile_api
    owner_id, owner_headers = _create_user(client, delivery, "profile-owner@example.com")
    _attacker_id, attacker_headers = _create_user(
        client, delivery, "profile-attacker@example.com"
    )

    rejected = client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={
            "displayName": "Owner",
            "username": "bad-name",
            "bio": "should not persist",
        },
    )
    assert rejected.status_code == 422
    non_ascii_username = client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={"displayName": "Owner", "username": "Kelvin"},
    )
    assert non_ascii_username.status_code == 422
    valid = client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={"displayName": "Owner", "username": "owner_user"},
    )
    assert valid.status_code == 200
    assert client.patch(
        "/api/v1/me/profile",
        headers=attacker_headers,
        json={"actorAccountId": owner_id, "displayName": "Takeover"},
    ).status_code == 422
    assert client.get("/api/v1/me/profile", headers=attacker_headers).status_code == 404
    assert client.get(
        f"/api/v1/profiles/{owner_id}",
        headers=owner_headers,
    ).json()["displayName"] == "Owner"
    assert client.patch(
        "/api/v1/me/profile",
        headers=attacker_headers,
        json={"displayName": "Attacker", "username": "OWNER_USER"},
    ).status_code == 409
    assert client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={"username": "renamed_user"},
    ).status_code == 200
    reused = client.patch(
        "/api/v1/me/profile",
        headers=attacker_headers,
        json={"displayName": "Attacker", "username": "OWNER_USER"},
    )
    assert reused.status_code == 200, reused.text
    assert client.put(
        "/api/v1/me/music-preferences",
        headers=owner_headers,
        json={"preferredGenres": ["Jazz", " jazz "]},
    ).status_code == 422
    assert client.put(
        "/api/v1/me/music-preferences",
        headers=owner_headers,
        json={"preferredGenres": ["x" * 51]},
    ).status_code == 422
    assert client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={"displayName": "x" * 41},
    ).status_code == 422
    assert client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={"bio": "x" * 501},
    ).status_code == 422
    assert client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={"location": "x" * 101},
    ).status_code == 422


def test_profile_completion_requires_saved_profile_and_is_idempotent(profile_api) -> None:
    client, delivery = profile_api
    account_id, headers = _create_user(
        client, delivery, "onboarding-profile@example.com"
    )

    missing_profile = client.post(
        "/api/v1/me/onboarding/profile-completed",
        headers=headers,
    )
    assert missing_profile.status_code == 422
    assert missing_profile.json()["error"]["code"] == "VALIDATION_ERROR"
    assert client.get("/api/v1/me", headers=headers).json()["profileCompleted"] is False

    incomplete_profile = client.patch(
        "/api/v1/me/profile",
        headers=headers,
        json={"displayName": "Onboarding User"},
    )
    assert incomplete_profile.status_code == 422
    still_incomplete = client.post(
        "/api/v1/me/onboarding/profile-completed",
        headers=headers,
    )
    assert still_incomplete.status_code == 422

    saved_profile = client.patch(
        "/api/v1/me/profile",
        headers=headers,
        json={"displayName": "Onboarding User", "username": "onboarding_user"},
    )
    assert saved_profile.status_code == 200
    assert (
        client.get(f"/api/v1/profiles/{account_id}", headers=headers).status_code
        == 200
    )
    completed = client.post(
        "/api/v1/me/onboarding/profile-completed",
        headers=headers,
    )
    assert completed.status_code == 200
    assert completed.json()["profileCompleted"] is True
    assert completed.json()["onboardingStep"] == "HOME"
    repeated = client.post(
        "/api/v1/me/onboarding/profile-completed",
        headers=headers,
    )
    assert repeated.status_code == 200
    assert repeated.json() == completed.json()
    assert client.get("/api/v1/me/profile", headers=headers).json()["username"] == (
        "onboarding_user"
    )


def test_avatar_upload_read_replace_and_delete_are_persistent(profile_api) -> None:
    client, delivery = profile_api
    account_id, headers = _create_user(client, delivery, "avatar-owner@example.com")
    assert client.put(
        "/api/v1/me/avatar",
        headers={**headers, "Content-Type": "image/png"},
        content=_image_bytes(),
    ).status_code == 404

    created = client.patch(
        "/api/v1/me/profile",
        headers=headers,
        json={"displayName": "Avatar Owner", "username": "avatar_owner"},
    )
    assert created.status_code == 200
    png = _image_bytes()
    uploaded = client.put(
        "/api/v1/me/avatar",
        headers={**headers, "Content-Type": "image/png"},
        content=png,
    )
    assert uploaded.status_code == 200
    avatar_url = f"/api/v1/profiles/{account_id}/avatar"
    assert uploaded.json() == {"avatarUrl": avatar_url}
    profile = client.get("/api/v1/me/profile", headers=headers)
    assert profile.status_code == 200
    assert profile.json()["avatarUrl"] == avatar_url

    with Session(get_db_engine()) as db:
        avatar = db.get(ProfileAvatar, account_id)
        assert avatar is not None
        assert avatar.content_type == "image/png"
        assert avatar.image_data == png

    image_response = client.get(avatar_url, headers=headers)
    assert image_response.status_code == 200
    assert image_response.content == png
    assert image_response.headers["content-type"] == "image/png"
    assert image_response.headers["cache-control"] == "private, no-store"
    assert image_response.headers["x-content-type-options"] == "nosniff"

    webp = _image_bytes("WEBP")
    replaced = client.put(
        "/api/v1/me/avatar",
        headers={**headers, "Content-Type": "image/webp"},
        content=webp,
    )
    assert replaced.status_code == 200
    assert client.get(avatar_url, headers=headers).content == webp
    with Session(get_db_engine()) as db:
        avatar = db.get(ProfileAvatar, account_id)
        assert avatar is not None
        assert avatar.content_type == "image/webp"
        assert avatar.image_data == webp

    assert client.delete("/api/v1/me/avatar", headers=headers).status_code == 204
    assert client.delete("/api/v1/me/avatar", headers=headers).status_code == 204
    assert client.get(avatar_url, headers=headers).status_code == 404
    assert client.get("/api/v1/me/profile", headers=headers).json()["avatarUrl"] is None
    with Session(get_db_engine()) as db:
        assert db.get(ProfileAvatar, account_id) is None


@pytest.mark.parametrize(
    ("content_type", "content", "expected_status", "expected_code"),
    [
        ("image/gif", b"GIF89a", 415, "UNSUPPORTED_MEDIA_TYPE"),
        ("image/png", b"not an image", 415, "INVALID_AVATAR"),
        ("image/jpeg", _image_bytes("PNG"), 415, "INVALID_AVATAR"),
        ("image/png", b"x" * (MAX_AVATAR_BYTES + 1), 413, "AVATAR_TOO_LARGE"),
    ],
)
def test_avatar_upload_rejects_invalid_mime_content_and_size(
    profile_api,
    content_type: str,
    content: bytes,
    expected_status: int,
    expected_code: str,
) -> None:
    client, delivery = profile_api
    _account_id, headers = _create_user(
        client, delivery, f"avatar-validation-{expected_status}@example.com"
    )
    created = client.patch(
        "/api/v1/me/profile",
        headers=headers,
        json={"displayName": "Avatar User", "username": f"avatar_user_{expected_status}"},
    )
    assert created.status_code == 200
    response = client.put(
        "/api/v1/me/avatar",
        headers={**headers, "Content-Type": content_type},
        content=content,
    )
    assert response.status_code == expected_status
    assert response.json()["error"]["code"] == expected_code


@pytest.mark.parametrize(
    ("privacy", "friend_can_read", "stranger_can_read"),
    [
        ("public", True, True),
        ("friends", True, False),
        ("private", False, False),
    ],
)
def test_avatar_reads_follow_profile_privacy(
    profile_api,
    privacy: str,
    friend_can_read: bool,
    stranger_can_read: bool,
) -> None:
    client, delivery = profile_api
    owner_id, owner_headers = _create_user(
        client, delivery, f"avatar-privacy-owner-{privacy}@example.com"
    )
    _friend_id, friend_headers = _create_user(
        client, delivery, f"avatar-privacy-friend-{privacy}@example.com"
    )
    _stranger_id, stranger_headers = _create_user(
        client, delivery, f"avatar-privacy-stranger-{privacy}@example.com"
    )
    owner_profile = client.patch(
        "/api/v1/me/profile",
        headers=owner_headers,
        json={"displayName": "Privacy Owner", "username": f"privacy_owner_{privacy}"},
    )
    assert owner_profile.status_code == 200
    assert client.patch(
        "/api/v1/me/privacy",
        headers=owner_headers,
        json={"privacy": privacy},
    ).status_code == 200

    request = client.post(
        "/api/v1/friend-requests",
        headers=friend_headers,
        json={"targetAccountId": owner_id},
    )
    assert request.status_code == 201
    assert client.post(
        f"/api/v1/friend-requests/{request.json()['id']}/accept",
        headers=owner_headers,
    ).status_code == 200

    upload = client.put(
        "/api/v1/me/avatar",
        headers={**owner_headers, "Content-Type": "image/jpeg"},
        content=_image_bytes("JPEG"),
    )
    assert upload.status_code == 200
    avatar_url = f"/api/v1/profiles/{owner_id}/avatar"
    assert client.get(avatar_url, headers=owner_headers).status_code == 200
    assert (
        client.get(avatar_url, headers=friend_headers).status_code
        == (200 if friend_can_read else 404)
    )
    assert (
        client.get(avatar_url, headers=stranger_headers).status_code
        == (200 if stranger_can_read else 404)
    )
    friend_profile = client.get(
        f"/api/v1/profiles/{owner_id}",
        headers=friend_headers,
    )
    stranger_profile = client.get(
        f"/api/v1/profiles/{owner_id}",
        headers=stranger_headers,
    )
    assert friend_profile.json()["avatarUrl"] == (
        avatar_url if friend_can_read else None
    )
    assert stranger_profile.json()["avatarUrl"] == (
        avatar_url if stranger_can_read else None
    )


def test_avatar_routes_require_authentication_and_openapi_declares_upload(
    profile_api,
) -> None:
    client, _delivery = profile_api
    assert client.put(
        "/api/v1/me/avatar",
        headers={"Content-Type": "image/png"},
        content=_image_bytes(),
    ).status_code == 401
    assert client.delete("/api/v1/me/avatar").status_code == 401
    assert client.get(
        "/api/v1/profiles/00000000-0000-0000-0000-000000000001/avatar"
    ).status_code == 401
    schema = client.get("/openapi.json").json()
    assert "/api/v1/me/avatar" in schema["paths"]
    assert "/api/v1/profiles/{account_id}/avatar" in schema["paths"]
    assert set(schema["paths"]["/api/v1/me/avatar"]["put"]["requestBody"]["content"]) == {
        "image/jpeg",
        "image/png",
        "image/webp",
    }


def test_profile_routes_are_authenticated_and_openapi_has_no_profile_search_or_counts(
    profile_api,
) -> None:
    client, delivery = profile_api
    assert client.get("/api/v1/me/profile").status_code == 401
    assert client.post(
        "/api/v1/friend-requests",
        json={"targetAccountId": "00000000-0000-0000-0000-000000000001"},
    ).status_code == 401
    _account_id, headers = _create_user(client, delivery, "relationship@example.com")
    unknown_relationship = client.get(
        "/api/v1/friends/00000000-0000-0000-0000-000000000001/relationship",
        headers=headers,
    )
    assert unknown_relationship.status_code == 200
    assert unknown_relationship.json()["status"] == "none"

    schema = client.get("/openapi.json").json()
    assert "/api/v1/me/profile" in schema["paths"]
    assert "/api/v1/profiles/{account_id}" in schema["paths"]
    assert "/api/v1/me/avatar" in schema["paths"]
    assert "/api/v1/friend-requests/{request_id}/accept" in schema["paths"]
    assert "/api/v1/friends" in schema["paths"]
    assert "/api/v1/profiles" not in schema["paths"]
    assert "avatarUrl" in schema["components"]["schemas"]["ProfileResponse"]["properties"]
    username_schema = next(
        option
        for option in schema["components"]["schemas"]["ProfileUpdate"]["properties"][
            "username"
        ]["anyOf"]
        if option.get("type") == "string"
    )
    assert username_schema["pattern"] == r"^[A-Za-z0-9_]{3,30}$"
    genre_schema = schema["components"]["schemas"]["MusicPreferencesUpdate"]["properties"][
        "preferredGenres"
    ]
    assert genre_schema["maxItems"] == 20
    assert genre_schema["items"]["minLength"] == 1
    assert genre_schema["items"]["maxLength"] == 50
