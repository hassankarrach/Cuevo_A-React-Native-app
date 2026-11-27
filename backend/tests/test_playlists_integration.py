from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.auth.email import InMemoryEmailDelivery
from app.auth.models import Account
from app.catalog.importer import seed_demo_catalog
from app.catalog.models import Song
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db_engine
from app.main import create_app
from app.playlists.models import (
    Playlist,
    PlaylistEntry,
    PlaylistInvitation,
)
from app.playlists.service import grant_playlist_edit_license


@pytest.fixture
def playlist_api():
    engine = get_db_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_demo_catalog(db)
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
    password = "playlist-test-password"
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


def _create_playlist(
    client: TestClient,
    headers: dict[str, str],
    *,
    name: str = "Shared mix",
    **fields,
) -> dict:
    response = client.post(
        "/api/v1/playlists",
        headers=headers,
        json={"name": name, "operationId": str(uuid4()), **fields},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _catalog_song_ids(engine) -> list[UUID]:
    with Session(engine) as db:
        return list(db.scalars(select(Song.id).order_by(Song.id)).all())


def test_playlist_public_private_visibility_invitation_acceptance_and_revoke(
    playlist_api,
) -> None:
    client, delivery, _engine, _app = playlist_api
    owner_id, owner_headers = _create_user(
        client, delivery, "playlist-visibility-owner@example.com"
    )
    invitee_id, invitee_headers = _create_user(
        client, delivery, "playlist-visibility-invitee@example.com"
    )
    public = _create_playlist(client, owner_headers)
    assert public["visibility"] == "public"
    assert public["editPolicy"] == "everyone"
    assert public["permissions"] == {
        "canRead": True,
        "canEdit": True,
        "canManage": True,
    }
    assert client.get(
        f"/api/v1/playlists/{public['id']}", headers=invitee_headers
    ).status_code == 200

    private = _create_playlist(
        client,
        owner_headers,
        name="private rehearsal list",
        visibility="private",
    )
    playlist_id = private["id"]
    assert client.get(
        f"/api/v1/playlists/{playlist_id}", headers=invitee_headers
    ).json()["error"]["code"] == "NOT_FOUND"
    search = client.get(
        "/api/v1/playlists",
        headers=invitee_headers,
        params={"q": "private rehearsal"},
    )
    assert search.status_code == 200
    assert search.json()["items"] == []

    invitation_body = {
        "expectedRevision": "1",
        "operationId": str(uuid4()),
        "inviteeAccountId": str(invitee_id),
    }
    invite = client.post(
        f"/api/v1/playlists/{playlist_id}/invitations",
        headers=owner_headers,
        json=invitation_body,
    )
    assert invite.status_code == 201, invite.text
    invitation_id = invite.json()["id"]
    invite_retry = client.post(
        f"/api/v1/playlists/{playlist_id}/invitations",
        headers=owner_headers,
        json=invitation_body,
    )
    assert invite_retry.status_code == 201
    assert invite_retry.json()["id"] == invitation_id
    assert invite_retry.json()["status"] == "pending"
    assert client.get(
        f"/api/v1/playlists/{playlist_id}", headers=invitee_headers
    ).status_code == 404
    incoming = client.get(
        "/api/v1/playlists/invitations", headers=invitee_headers
    ).json()["items"]
    assert [item["id"] for item in incoming] == [invitation_id]

    accepted = client.post(
        f"/api/v1/playlists/invitations/{invitation_id}/respond",
        headers=invitee_headers,
        json={
            "expectedRevision": "2",
            "operationId": str(uuid4()),
            "response": "accepted",
        },
    )
    assert accepted.status_code == 200, accepted.text
    snapshot = client.get(
        f"/api/v1/playlists/{playlist_id}", headers=invitee_headers
    )
    assert snapshot.status_code == 200
    assert snapshot.json()["permissions"]["canRead"] is True
    assert snapshot.json()["permissions"]["canEdit"] is True

    revoke_body = {"expectedRevision": "3", "operationId": str(uuid4())}
    revoked = client.request(
        "DELETE",
        f"/api/v1/playlists/{playlist_id}/invitations/{invitation_id}",
        headers=owner_headers,
        json=revoke_body,
    )
    assert revoked.status_code == 200, revoked.text
    assert revoked.json()["status"] == "revoked"
    revoke_retry = client.request(
        "DELETE",
        f"/api/v1/playlists/{playlist_id}/invitations/{invitation_id}",
        headers=owner_headers,
        json=revoke_body,
    )
    assert revoke_retry.status_code == 200
    assert revoke_retry.json()["status"] == "revoked"
    assert client.get(
        f"/api/v1/playlists/{playlist_id}", headers=invitee_headers
    ).json()["error"]["code"] == "NOT_FOUND"
    assert client.get(
        "/api/v1/notifications/unread-count", headers=invitee_headers
    ).json()["unreadCount"] == 2
    assert owner_id != invitee_id


def test_default_editing_entries_retries_stale_revisions_and_atomic_validation(
    playlist_api,
) -> None:
    client, delivery, engine, _app = playlist_api
    _owner_id, owner_headers = _create_user(
        client, delivery, "playlist-edit-owner@example.com"
    )
    _editor_id, editor_headers = _create_user(
        client, delivery, "playlist-edit-editor@example.com"
    )
    playlist = _create_playlist(client, owner_headers)
    song_ids = _catalog_song_ids(engine)
    add_body = {
        "expectedRevision": "1",
        "operationId": str(uuid4()),
        "songIds": [str(song_ids[0]), str(song_ids[1])],
    }
    added = client.post(
        f"/api/v1/playlists/{playlist['id']}/entries",
        headers=editor_headers,
        json=add_body,
    )
    assert added.status_code == 200, added.text
    added_snapshot = added.json()
    assert added_snapshot["revision"] == "2"
    assert [entry["position"] for entry in added_snapshot["entries"]] == [0, 1]
    assert all(
        entry["addedByAccountId"] == str(_editor_id)
        for entry in added_snapshot["entries"]
    )

    retry = client.post(
        f"/api/v1/playlists/{playlist['id']}/entries",
        headers=editor_headers,
        json=add_body,
    )
    assert retry.status_code == 200
    assert retry.json()["revision"] == "2"
    assert [item["id"] for item in retry.json()["entries"]] == [
        item["id"] for item in added_snapshot["entries"]
    ]

    duplicate = client.post(
        f"/api/v1/playlists/{playlist['id']}/entries",
        headers=editor_headers,
        json={
            "expectedRevision": "2",
            "operationId": str(uuid4()),
            "songIds": [str(song_ids[0])],
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "DUPLICATE_SONG"

    reordered_ids = [
        entry["id"] for entry in reversed(added_snapshot["entries"])
    ]
    reordered = client.put(
        f"/api/v1/playlists/{playlist['id']}/entries/order",
        headers=editor_headers,
        json={
            "expectedRevision": "2",
            "operationId": str(uuid4()),
            "entryIds": reordered_ids,
        },
    )
    assert reordered.status_code == 200, reordered.text
    assert [entry["id"] for entry in reordered.json()["entries"]] == reordered_ids
    assert [entry["position"] for entry in reordered.json()["entries"]] == [0, 1]

    stale = client.patch(
        f"/api/v1/playlists/{playlist['id']}",
        headers=owner_headers,
        json={
            "expectedRevision": "1",
            "operationId": str(uuid4()),
            "name": "stale overwrite",
        },
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"
    assert stale.json()["error"]["details"]["currentRevision"] == "3"
    latest = client.get(
        f"/api/v1/playlists/{playlist['id']}", headers=owner_headers
    ).json()
    assert latest["name"] == "Shared mix"
    assert latest["revision"] == "3"

    removed_entry = reordered.json()["entries"][0]["id"]
    removed = client.request(
        "DELETE",
        f"/api/v1/playlists/{playlist['id']}/entries/{removed_entry}",
        headers=editor_headers,
        json={"expectedRevision": "3", "operationId": str(uuid4())},
    )
    assert removed.status_code == 200, removed.text
    assert len(removed.json()["entries"]) == 1
    assert removed.json()["entries"][0]["position"] == 0

    empty = _create_playlist(client, owner_headers, name="Atomic list")
    invalid_add = client.post(
        f"/api/v1/playlists/{empty['id']}/entries",
        headers=editor_headers,
        json={
            "expectedRevision": "1",
            "operationId": str(uuid4()),
            "songIds": [str(song_ids[0]), str(uuid4())],
        },
    )
    assert invalid_add.status_code == 404
    unchanged = client.get(
        f"/api/v1/playlists/{empty['id']}", headers=owner_headers
    ).json()
    assert unchanged["revision"] == "1"
    assert unchanged["entries"] == []


def test_owner_only_and_licensed_invited_edit_policy_enforcement(playlist_api) -> None:
    client, delivery, engine, _app = playlist_api
    owner_id, owner_headers = _create_user(
        client, delivery, "playlist-policy-owner@example.com"
    )
    editor_id, editor_headers = _create_user(
        client, delivery, "playlist-policy-editor@example.com"
    )
    playlist = _create_playlist(client, owner_headers)
    changed = client.patch(
        f"/api/v1/playlists/{playlist['id']}",
        headers=owner_headers,
        json={
            "expectedRevision": "1",
            "operationId": str(uuid4()),
            "editPolicy": "owner",
        },
    )
    assert changed.status_code == 200
    denied = client.post(
        f"/api/v1/playlists/{playlist['id']}/entries",
        headers=editor_headers,
        json={
            "expectedRevision": "2",
            "operationId": str(uuid4()),
            "songIds": [str(_catalog_song_ids(engine)[0])],
        },
    )
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "FORBIDDEN"

    missing_license = client.post(
        "/api/v1/playlists",
        headers=owner_headers,
        json={
            "name": "Licensed list",
            "editPolicy": "collaborators",
            "operationId": str(uuid4()),
        },
    )
    assert missing_license.status_code == 403
    assert missing_license.json()["error"]["code"] == "LICENSE_REQUIRED"

    with Session(engine) as db:
        grant_playlist_edit_license(db, owner_id, expires_at=None)
        db.commit()
    licensed = _create_playlist(
        client,
        owner_headers,
        name="Licensed list",
        editPolicy="collaborators",
    )
    invitation = client.post(
        f"/api/v1/playlists/{licensed['id']}/invitations",
        headers=owner_headers,
        json={
            "expectedRevision": "1",
            "operationId": str(uuid4()),
            "inviteeAccountId": str(editor_id),
        },
    )
    assert invitation.status_code == 201
    accepted = client.post(
        f"/api/v1/playlists/invitations/{invitation.json()['id']}/respond",
        headers=editor_headers,
        json={
            "expectedRevision": "2",
            "operationId": str(uuid4()),
            "response": "accepted",
        },
    )
    assert accepted.status_code == 200
    invited_edit = client.post(
        f"/api/v1/playlists/{licensed['id']}/entries",
        headers=editor_headers,
        json={
            "expectedRevision": "3",
            "operationId": str(uuid4()),
            "songIds": [str(_catalog_song_ids(engine)[0])],
        },
    )
    assert invited_edit.status_code == 200


def test_concurrent_mutations_conflict_and_websocket_events_resync(playlist_api) -> None:
    client, delivery, engine, app = playlist_api
    _owner_id, owner_headers = _create_user(
        client, delivery, "playlist-realtime-owner@example.com"
    )
    _editor_id, editor_headers = _create_user(
        client, delivery, "playlist-realtime-editor@example.com"
    )
    playlist = _create_playlist(client, owner_headers)
    playlist_id = playlist["id"]
    songs = _catalog_song_ids(engine)

    def add(song_id: UUID) -> tuple[int, dict]:
        with TestClient(app, raise_server_exceptions=False) as concurrent_client:
            response = concurrent_client.post(
                f"/api/v1/playlists/{playlist_id}/entries",
                headers=editor_headers,
                json={
                    "expectedRevision": "1",
                    "operationId": str(uuid4()),
                    "songIds": [str(song_id)],
                },
            )
        return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(add, songs[:2]))
    assert sorted(status for status, _body in results) == [200, 409]
    committed = client.get(
        f"/api/v1/playlists/{playlist_id}", headers=owner_headers
    ).json()
    assert committed["revision"] == "2"
    assert len(committed["entries"]) == 1

    with client.websocket_connect(
        f"/api/v1/playlists/{playlist_id}/events?afterRevision=2",
        headers=editor_headers,
    ) as websocket:
        more_song = next(song for song in songs if str(song) not in {
            entry["songId"] for entry in committed["entries"]
        })
        added = client.post(
            f"/api/v1/playlists/{playlist_id}/entries",
            headers=editor_headers,
            json={
                "expectedRevision": "2",
                "operationId": str(uuid4()),
                "songIds": [str(more_song)],
            },
        )
        assert added.status_code == 200
        event = websocket.receive_json()
        assert event["type"] == "playlist.updated"
        assert event["revision"] == "3"
        assert "permissions" not in event["payload"]
        second_song = next(
            song
            for song in songs
            if str(song) not in {
                entry["songId"] for entry in added.json()["entries"]
            }
        )
        added_again = client.post(
            f"/api/v1/playlists/{playlist_id}/entries",
            headers=editor_headers,
            json={
                "expectedRevision": "3",
                "operationId": str(uuid4()),
                "songIds": [str(second_song)],
            },
        )
        assert added_again.status_code == 200
        next_event = websocket.receive_json()
        assert next_event["revision"] == "4"
        assert int(next_event["revision"]) == int(event["revision"]) + 1

    with client.websocket_connect(
        f"/api/v1/playlists/{playlist_id}/events?afterRevision=1",
        headers=editor_headers,
    ) as websocket:
        resync = websocket.receive_json()
        assert resync["type"] == "playlist.resync_required"
        assert resync["revision"] == "4"


def test_simultaneous_remove_and_reorder_are_serialized(playlist_api) -> None:
    client, delivery, engine, app = playlist_api
    _owner_id, owner_headers = _create_user(
        client, delivery, "playlist-order-owner@example.com"
    )
    _editor_id, editor_headers = _create_user(
        client, delivery, "playlist-order-editor@example.com"
    )
    playlist = _create_playlist(client, owner_headers, name="Concurrent order")
    playlist_id = playlist["id"]
    songs = _catalog_song_ids(engine)
    added = client.post(
        f"/api/v1/playlists/{playlist_id}/entries",
        headers=editor_headers,
        json={
            "expectedRevision": "1",
            "operationId": str(uuid4()),
            "songIds": [str(song) for song in songs[:3]],
        },
    )
    assert added.status_code == 200
    entries = added.json()["entries"]
    remove_entry_id = entries[0]["id"]
    reorder_ids = [entry["id"] for entry in reversed(entries)]

    def remove() -> tuple[int, dict]:
        with TestClient(app, raise_server_exceptions=False) as concurrent_client:
            response = concurrent_client.request(
                "DELETE",
                f"/api/v1/playlists/{playlist_id}/entries/{remove_entry_id}",
                headers=editor_headers,
                json={"expectedRevision": "2", "operationId": str(uuid4())},
            )
        return response.status_code, response.json()

    def reorder() -> tuple[int, dict]:
        with TestClient(app, raise_server_exceptions=False) as concurrent_client:
            response = concurrent_client.put(
                f"/api/v1/playlists/{playlist_id}/entries/order",
                headers=editor_headers,
                json={
                    "expectedRevision": "2",
                    "operationId": str(uuid4()),
                    "entryIds": reorder_ids,
                },
            )
        return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        removal, reorder_result = list(pool.map(lambda fn: fn(), (remove, reorder)))
    assert sorted((removal[0], reorder_result[0])) == [200, 409]
    latest = client.get(
        f"/api/v1/playlists/{playlist_id}", headers=owner_headers
    ).json()
    assert latest["revision"] == "3"
    positions = [entry["position"] for entry in latest["entries"]]
    assert positions == list(range(len(positions)))
    assert len(positions) in {2, 3}


def test_revoking_private_access_closes_authorized_websocket(playlist_api) -> None:
    client, delivery, _engine, _app = playlist_api
    _owner_id, owner_headers = _create_user(
        client, delivery, "playlist-ws-owner@example.com"
    )
    invitee_id, invitee_headers = _create_user(
        client, delivery, "playlist-ws-invitee@example.com"
    )
    playlist = _create_playlist(
        client, owner_headers, name="Invite-only list", visibility="private"
    )
    invitation = client.post(
        f"/api/v1/playlists/{playlist['id']}/invitations",
        headers=owner_headers,
        json={
            "expectedRevision": "1",
            "operationId": str(uuid4()),
            "inviteeAccountId": str(invitee_id),
        },
    )
    accepted = client.post(
        f"/api/v1/playlists/invitations/{invitation.json()['id']}/respond",
        headers=invitee_headers,
        json={
            "expectedRevision": "2",
            "operationId": str(uuid4()),
            "response": "accepted",
        },
    )
    assert accepted.status_code == 200

    with client.websocket_connect(
        f"/api/v1/playlists/{playlist['id']}/events?afterRevision=3",
        headers=invitee_headers,
    ) as websocket:
        revoked = client.request(
            "DELETE",
            f"/api/v1/playlists/{playlist['id']}/invitations/{invitation.json()['id']}",
            headers=owner_headers,
            json={"expectedRevision": "3", "operationId": str(uuid4())},
        )
        assert revoked.status_code == 200
        with pytest.raises(WebSocketDisconnect):
            websocket.receive_json()


def test_revoking_auth_session_closes_websocket_on_next_event(playlist_api) -> None:
    client, delivery, _engine, _app = playlist_api
    _owner_id, owner_headers = _create_user(
        client, delivery, "playlist-ws-session-owner@example.com"
    )
    _viewer_id, viewer_headers = _create_user(
        client, delivery, "playlist-ws-session-viewer@example.com"
    )
    playlist = _create_playlist(client, owner_headers, name="Session revocation")

    with client.websocket_connect(
        f"/api/v1/playlists/{playlist['id']}/events?afterRevision=1",
        headers=viewer_headers,
    ) as websocket:
        logout = client.post("/api/v1/auth/logout", headers=viewer_headers)
        assert logout.status_code == 204
        update = client.patch(
            f"/api/v1/playlists/{playlist['id']}",
            headers=owner_headers,
            json={
                "expectedRevision": "1",
                "operationId": str(uuid4()),
                "name": "Session revoked",
            },
        )
        assert update.status_code == 200
        with pytest.raises(WebSocketDisconnect):
            websocket.receive_json()


def test_playlist_hard_delete_is_idempotent_and_cascades_entries(playlist_api) -> None:
    client, delivery, engine, _app = playlist_api
    owner_id, owner_headers = _create_user(
        client, delivery, "playlist-delete-owner@example.com"
    )
    playlist = _create_playlist(client, owner_headers)
    song_id = _catalog_song_ids(engine)[0]
    added = client.post(
        f"/api/v1/playlists/{playlist['id']}/entries",
        headers=owner_headers,
        json={
            "expectedRevision": "1",
            "operationId": str(uuid4()),
            "songIds": [str(song_id)],
        },
    )
    assert added.status_code == 200
    delete_body = {
        "expectedRevision": "2",
        "operationId": str(uuid4()),
    }
    deleted = client.request(
        "DELETE",
        f"/api/v1/playlists/{playlist['id']}",
        headers=owner_headers,
        json=delete_body,
    )
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True, "revision": "3"}
    retried = client.request(
        "DELETE",
        f"/api/v1/playlists/{playlist['id']}",
        headers=owner_headers,
        json=delete_body,
    )
    assert retried.status_code == 200
    assert retried.json() == deleted.json()
    assert client.get(
        f"/api/v1/playlists/{playlist['id']}", headers=owner_headers
    ).status_code == 404
    with Session(engine) as db:
        assert db.scalar(
            select(Playlist).where(Playlist.id == UUID(playlist["id"]))
        ) is None
        assert db.scalar(
            select(PlaylistEntry).where(
                PlaylistEntry.playlist_id == UUID(playlist["id"])
            )
        ) is None
        assert db.scalar(
            select(PlaylistInvitation).where(
                PlaylistInvitation.playlist_id == UUID(playlist["id"])
            )
        ) is None
        assert db.get(Account, owner_id) is not None
