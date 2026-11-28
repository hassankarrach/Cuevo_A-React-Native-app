from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.auth.email import InMemoryEmailDelivery
from app.auth.models import AuthRateLimitBucket
from app.auth.security import utc_now
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db_engine
from app.main import create_app
from app.rooms.models import RoomJoinCode


@pytest.fixture
def room_api():
    engine = get_db_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    delivery = InMemoryEmailDelivery()
    app = create_app(get_settings(), email_delivery=delivery)
    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield client, delivery, engine, app
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def _create_user(
    client: TestClient,
    delivery: InMemoryEmailDelivery,
    email: str,
) -> tuple[UUID, dict[str, str]]:
    password = "room-test-password"
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert registered.status_code == 201, registered.text
    challenge = registered.json()
    verified = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": email,
            "challengeId": challenge["challengeId"],
            "code": delivery.messages[-1].code,
        },
    )
    assert verified.status_code == 200, verified.text
    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert logged_in.status_code == 200, logged_in.text
    return UUID(verified.json()["id"]), {
        "Authorization": f"Bearer {logged_in.json()['accessToken']}"
    }


def _create_room(
    client: TestClient,
    headers: dict[str, str],
    *,
    name: str = "Room integration",
    **fields,
) -> dict:
    response = client.post(
        "/api/v1/rooms",
        headers=headers,
        json={"name": name, "operationId": str(uuid4()), **fields},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _invitation(
    client: TestClient,
    room_id: str,
    host_headers: dict[str, str],
    invitee_id: UUID,
    revision: str,
) -> dict:
    response = client.post(
        f"/api/v1/rooms/{room_id}/invitations",
        headers=host_headers,
        json={
            "expectedRevision": revision,
            "operationId": str(uuid4()),
            "inviteeAccountId": str(invitee_id),
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _respond(
    client: TestClient,
    invitation_id: str,
    headers: dict[str, str],
    response: str = "accepted",
):
    return client.post(
        f"/api/v1/rooms/invitations/{invitation_id}/respond",
        headers=headers,
        json={"response": response},
    )


def test_public_discovery_visitor_join_leave_and_host_permissions(room_api) -> None:
    client, delivery, _engine, _app = room_api
    host_id, host_headers = _create_user(
        client, delivery, "room-public-host@example.com"
    )
    visitor_id, visitor_headers = _create_user(
        client, delivery, "room-public-visitor@example.com"
    )
    room = _create_room(client, host_headers)

    assert room["hostAccountId"] == str(host_id)
    assert room["visibility"] == "public"
    assert room["voteEligibility"] == "everyone"
    assert room["viewerRole"] == "host"
    assert room["participantsCount"] == 1
    assert room["permissions"]["canManage"] is True
    assert room["participants"][0]["role"] == "host"

    listed = client.get("/api/v1/rooms?q=integration", headers=visitor_headers)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["items"]] == [room["id"]]
    snapshot = client.get(f"/api/v1/rooms/{room['id']}", headers=visitor_headers)
    assert snapshot.status_code == 200
    assert snapshot.json()["viewerRole"] == "visitor"
    assert snapshot.json()["participantsCount"] == 1
    assert snapshot.json()["permissions"]["canVote"] is True
    assert snapshot.json()["permissions"]["canJoin"] is True

    joined = client.post(
        f"/api/v1/rooms/{room['id']}/join",
        headers=visitor_headers,
        json={"expectedRevision": "1", "operationId": str(uuid4())},
    )
    assert joined.status_code == 200, joined.text
    assert joined.json()["viewerRole"] == "member"
    assert joined.json()["participantsCount"] == 2
    assert joined.json()["permissions"]["canLeave"] is True

    left = client.post(
        f"/api/v1/rooms/{room['id']}/leave",
        headers=visitor_headers,
        json={
            "expectedRevision": joined.json()["revision"],
            "operationId": str(uuid4()),
        },
    )
    assert left.status_code == 200, left.text
    assert left.json()["viewerRole"] == "visitor"
    assert left.json()["participantsCount"] == 1
    host_leave = client.post(
        f"/api/v1/rooms/{room['id']}/leave",
        headers=host_headers,
        json={"expectedRevision": left.json()["revision"], "operationId": str(uuid4())},
    )
    assert host_leave.status_code == 409
    assert host_leave.json()["error"]["code"] == "HOST_CANNOT_LEAVE"

    updated = client.patch(
        f"/api/v1/rooms/{room['id']}",
        headers=host_headers,
        json={
            "expectedRevision": left.json()["revision"],
            "operationId": str(uuid4()),
            "name": "Renamed public room",
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Renamed public room"
    unauthorized_update = client.patch(
        f"/api/v1/rooms/{room['id']}",
        headers=visitor_headers,
        json={
            "expectedRevision": updated.json()["revision"],
            "operationId": str(uuid4()),
            "name": "Unauthorized edit",
        },
    )
    assert unauthorized_update.status_code == 403


def test_private_room_invite_access_search_counts_and_revocation(room_api) -> None:
    client, delivery, _engine, _app = room_api
    host_id, host_headers = _create_user(
        client, delivery, "room-private-host@example.com"
    )
    invitee_id, invitee_headers = _create_user(
        client, delivery, "room-private-invitee@example.com"
    )
    stranger_id, stranger_headers = _create_user(
        client, delivery, "room-private-stranger@example.com"
    )
    room = _create_room(
        client,
        host_headers,
        name="Private access fixture",
        visibility="private",
    )
    room_id = room["id"]

    assert client.get(f"/api/v1/rooms/{room_id}", headers=stranger_headers).status_code == 404
    assert client.get(
        f"/api/v1/rooms/{room_id}/participants", headers=stranger_headers
    ).status_code == 404
    private_search = client.get(
        "/api/v1/rooms?q=private+access", headers=stranger_headers
    )
    assert private_search.status_code == 200
    assert private_search.json()["items"] == []

    invitation = _invitation(client, room_id, host_headers, invitee_id, "1")
    pending = client.get(f"/api/v1/rooms/{room_id}", headers=invitee_headers)
    assert pending.status_code == 404
    assert client.get("/api/v1/rooms/invitations", headers=invitee_headers).json()[
        "items"
    ][0]["id"] == invitation["id"]
    assert _respond(client, invitation["id"], stranger_headers).status_code == 404

    accepted = _respond(client, invitation["id"], invitee_headers)
    assert accepted.status_code == 200, accepted.text
    invitee_room = client.get(f"/api/v1/rooms/{room_id}", headers=invitee_headers)
    assert invitee_room.status_code == 200
    assert invitee_room.json()["viewerRole"] == "visitor"
    assert invitee_room.json()["participantsCount"] == 1
    assert invitee_room.json()["permissions"]["canVote"] is True
    invitee_search = client.get(
        "/api/v1/rooms?q=private+access", headers=invitee_headers
    )
    assert [item["id"] for item in invitee_search.json()["items"]] == [room_id]

    joined = client.post(
        f"/api/v1/rooms/{room_id}/join",
        headers=invitee_headers,
        json={
            "expectedRevision": invitee_room.json()["revision"],
            "operationId": str(uuid4()),
        },
    )
    assert joined.status_code == 200, joined.text
    assert joined.json()["participantsCount"] == 2

    revoked = client.delete(
        f"/api/v1/rooms/{room_id}/invitations/{invitation['id']}",
        headers=host_headers,
    )
    assert revoked.status_code == 200
    assert client.get(f"/api/v1/rooms/{room_id}", headers=invitee_headers).status_code == 404
    assert client.get(f"/api/v1/rooms/{room_id}", headers=stranger_headers).status_code == 404
    assert UUID(revoked.json()["inviteeAccountId"]) == invitee_id
    assert UUID(revoked.json()["inviterAccountId"]) == host_id

    transitioning = _create_room(
        client, host_headers, name="Visibility transition"
    )
    public_join = client.post(
        f"/api/v1/rooms/{transitioning['id']}/join",
        headers=stranger_headers,
        json={"expectedRevision": "1", "operationId": str(uuid4())},
    )
    assert public_join.status_code == 200
    made_private = client.patch(
        f"/api/v1/rooms/{transitioning['id']}",
        headers=host_headers,
        json={
            "expectedRevision": public_join.json()["revision"],
            "operationId": str(uuid4()),
            "visibility": "private",
        },
    )
    assert made_private.status_code == 200
    assert made_private.json()["participantsCount"] == 1
    assert client.get(
        f"/api/v1/rooms/{transitioning['id']}", headers=stranger_headers
    ).status_code == 404


def test_private_join_code_rotation_expiry_replay_and_throttling(room_api) -> None:
    client, delivery, engine, _app = room_api
    host_id, host_headers = _create_user(
        client, delivery, "room-code-host@example.com"
    )
    invitee_id, invitee_headers = _create_user(
        client, delivery, "room-code-invitee@example.com"
    )
    _stranger_id, stranger_headers = _create_user(
        client, delivery, "room-code-stranger@example.com"
    )
    room = _create_room(
        client, host_headers, name="Code room", visibility="private"
    )
    invitation = _invitation(client, room["id"], host_headers, invitee_id, "1")
    accepted = _respond(client, invitation["id"], invitee_headers)
    assert accepted.status_code == 200
    code = client.post(
        f"/api/v1/rooms/{room['id']}/join-code", headers=host_headers
    )
    assert code.status_code == 200, code.text
    first_code = code.json()["code"]
    assert len(first_code) == 6
    assert set(first_code) <= set("23456789ABCDEFGHJKLMNPQRSTUVWXYZ")
    assert code.json()["expiresAt"]

    unauthorized = client.post(
        "/api/v1/rooms/join-by-code",
        headers=stranger_headers,
        json={"code": first_code},
    )
    assert unauthorized.status_code == 404
    assert unauthorized.json()["error"]["code"] == "NOT_FOUND"

    success = client.post(
        "/api/v1/rooms/join-by-code",
        headers=invitee_headers,
        json={"code": first_code},
    )
    assert success.status_code == 200, success.text
    replay = client.post(
        "/api/v1/rooms/join-by-code",
        headers=invitee_headers,
        json={"code": first_code},
    )
    assert replay.status_code == 200
    assert replay.json()["room"]["participantsCount"] == 2

    second = client.post(
        f"/api/v1/rooms/{room['id']}/join-code", headers=host_headers
    )
    assert second.status_code == 200
    assert second.json()["code"] != first_code
    old_code = client.post(
        "/api/v1/rooms/join-by-code",
        headers=invitee_headers,
        json={"code": first_code},
    )
    assert old_code.status_code == 404

    with Session(engine) as db:
        code_row = db.scalar(
            select(RoomJoinCode).where(RoomJoinCode.room_id == UUID(room["id"]))
        )
        assert code_row is not None
        code_row.created_at = utc_now() - timedelta(days=2)
        code_row.expires_at = utc_now() - timedelta(seconds=1)
        db.commit()
    expired = client.post(
        "/api/v1/rooms/join-by-code",
        headers=invitee_headers,
        json={"code": second.json()["code"]},
    )
    assert expired.status_code == 404

    revoked_code = client.post(
        f"/api/v1/rooms/{room['id']}/join-code", headers=host_headers
    )
    assert revoked_code.status_code == 200
    revoked = client.delete(
        f"/api/v1/rooms/{room['id']}/join-code", headers=host_headers
    )
    assert revoked.status_code == 204
    after_revoke = client.post(
        "/api/v1/rooms/join-by-code",
        headers=invitee_headers,
        json={"code": revoked_code.json()["code"]},
    )
    assert after_revoke.status_code == 404

    with Session(engine) as db:
        db.execute(delete(AuthRateLimitBucket))
        db.commit()
    # The first five failed attempts receive the same generic invalid-code result.
    for _ in range(5):
        response = client.post(
            "/api/v1/rooms/join-by-code",
            headers=invitee_headers,
            json={"code": "222222"},
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"
    throttled = client.post(
        "/api/v1/rooms/join-by-code",
        headers=invitee_headers,
        json={"code": "222222"},
    )
    assert throttled.status_code == 429
    assert throttled.json()["error"]["code"] == "RATE_LIMITED"
    assert host_id != invitee_id


def test_invitees_only_vote_policy_requires_license_and_is_not_visibility(room_api) -> None:
    client, delivery, _engine, _app = room_api
    _host_id, host_headers = _create_user(
        client, delivery, "room-policy-host@example.com"
    )
    forbidden = client.post(
        "/api/v1/rooms",
        headers=host_headers,
        json={
            "name": "Licensed policy",
            "visibility": "public",
            "voteEligibility": "invitees",
            "operationId": str(uuid4()),
        },
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "LICENSE_REQUIRED"


def test_room_end_is_terminal_and_host_only(room_api) -> None:
    client, delivery, _engine, _app = room_api
    _host_id, host_headers = _create_user(
        client, delivery, "room-end-host@example.com"
    )
    _visitor_id, visitor_headers = _create_user(
        client, delivery, "room-end-visitor@example.com"
    )
    room = _create_room(client, host_headers, name="Terminal room")

    forbidden = client.post(
        f"/api/v1/rooms/{room['id']}/end",
        headers=visitor_headers,
        json={"expectedRevision": "1", "operationId": str(uuid4())},
    )
    assert forbidden.status_code == 403
    ended = client.post(
        f"/api/v1/rooms/{room['id']}/end",
        headers=host_headers,
        json={"expectedRevision": "1", "operationId": str(uuid4())},
    )
    assert ended.status_code == 200, ended.text
    assert ended.json()["status"] == "ended"
    assert ended.json()["endedAt"] is not None
    assert client.get("/api/v1/rooms", headers=visitor_headers).json()["items"] == []
    assert client.get(
        f"/api/v1/rooms/{room['id']}", headers=visitor_headers
    ).status_code == 404
    assert client.get(
        f"/api/v1/rooms/{room['id']}", headers=host_headers
    ).status_code == 200

    update = client.patch(
        f"/api/v1/rooms/{room['id']}",
        headers=host_headers,
        json={
            "expectedRevision": ended.json()["revision"],
            "operationId": str(uuid4()),
            "name": "Reopened room",
        },
    )
    assert update.status_code == 409
    assert update.json()["error"]["code"] == "ROOM_ENDED"


def test_active_private_websocket_is_closed_after_invitation_revocation(room_api) -> None:
    client, delivery, _engine, _app = room_api
    host_id, host_headers = _create_user(
        client, delivery, "room-ws-host@example.com"
    )
    invitee_id, invitee_headers = _create_user(
        client, delivery, "room-ws-invitee@example.com"
    )
    room = _create_room(
        client, host_headers, name="Realtime private", visibility="private"
    )
    invitation = _invitation(client, room["id"], host_headers, invitee_id, "1")
    assert _respond(client, invitation["id"], invitee_headers).status_code == 200

    with client.websocket_connect(
        f"/api/v1/rooms/{room['id']}/events",
        headers=invitee_headers,
    ) as websocket:
        initial = websocket.receive_json()
        assert initial["type"] == "room.resync_required"
        revoked = client.delete(
            f"/api/v1/rooms/{room['id']}/invitations/{invitation['id']}",
            headers=host_headers,
        )
        assert revoked.status_code == 200
        with pytest.raises(WebSocketDisconnect):
            websocket.receive_json()

    assert host_id != invitee_id
