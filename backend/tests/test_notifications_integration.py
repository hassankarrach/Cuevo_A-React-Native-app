from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.email import InMemoryEmailDelivery
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db_engine
from app.main import create_app
from app.notifications.models import Notification
from app.notifications.service import (
    DestinationReference,
    NotificationIdempotencyConflict,
    create_notification,
)
from app.profiles.models import Profile


@pytest.fixture
def notification_api():
    engine = get_db_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    delivery = InMemoryEmailDelivery()
    app = create_app(get_settings(), email_delivery=delivery)
    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield client, delivery, engine
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def _create_user(
    client: TestClient,
    delivery: InMemoryEmailDelivery,
    email: str,
) -> tuple[UUID, dict[str, str]]:
    password = "notification-test-password"
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


def _insert_notification(
    engine,
    *,
    recipient_id: UUID,
    event_id: UUID | None = None,
    actor_id: UUID | None = None,
    kind: str = "room_activity",
    destination: DestinationReference | None = None,
) -> UUID:
    with Session(engine) as db:
        notification = create_notification(
            db,
            recipient_account_id=recipient_id,
            producer_event_id=event_id or uuid4(),
            actor_account_id=actor_id,
            kind=kind,
            destination=destination,
        )
        notification_id = notification.id
        db.commit()
        return notification_id


def test_notification_reads_and_updates_are_recipient_scoped(notification_api) -> None:
    client, delivery, engine = notification_api
    alice_id, alice_headers = _create_user(
        client, delivery, "notification-alice@example.com"
    )
    bob_id, bob_headers = _create_user(
        client, delivery, "notification-bob@example.com"
    )
    alice_notification = _insert_notification(
        engine,
        recipient_id=alice_id,
        kind="friend_request",
        actor_id=bob_id,
        destination=DestinationReference("profile", bob_id),
    )
    bob_notification = _insert_notification(
        engine,
        recipient_id=bob_id,
        kind="friend_accepted",
        actor_id=alice_id,
    )

    alice_list = client.get("/api/v1/notifications", headers=alice_headers)
    bob_list = client.get("/api/v1/notifications", headers=bob_headers)
    assert [item["id"] for item in alice_list.json()["items"]] == [
        str(alice_notification)
    ]
    assert [item["id"] for item in bob_list.json()["items"]] == [str(bob_notification)]
    assert client.get(
        f"/api/v1/notifications/{alice_notification}",
        headers=bob_headers,
    ).json()["error"]["code"] == "NOT_FOUND"
    assert client.patch(
        f"/api/v1/notifications/{alice_notification}/read",
        headers=bob_headers,
    ).json()["error"]["code"] == "NOT_FOUND"
    assert client.get(
        "/api/v1/notifications/unread-count",
        headers=alice_headers,
    ).json() == {"unreadCount": 1}
    assert client.get(
        "/api/v1/notifications/unread-count",
        headers=bob_headers,
    ).json() == {"unreadCount": 1}

    marked = client.patch(
        f"/api/v1/notifications/{alice_notification}/read",
        headers=alice_headers,
    )
    assert marked.status_code == 200
    first_read_at = marked.json()["readAt"]
    assert first_read_at
    assert marked.json()["createdAt"].endswith(("+00:00", "Z"))
    assert client.patch(
        f"/api/v1/notifications/{alice_notification}/read",
        headers=alice_headers,
    ).json()["readAt"] == first_read_at
    assert client.get(
        "/api/v1/notifications/unread-count",
        headers=alice_headers,
    ).json() == {"unreadCount": 0}
    assert client.get(
        "/api/v1/notifications?status=read",
        headers=alice_headers,
    ).json()["items"][0]["id"] == str(alice_notification)


def test_mark_all_read_only_updates_the_authenticated_recipients_rows(
    notification_api,
) -> None:
    client, delivery, engine = notification_api
    alice_id, alice_headers = _create_user(
        client, delivery, "notification-mark-all-alice@example.com"
    )
    bob_id, bob_headers = _create_user(
        client, delivery, "notification-mark-all-bob@example.com"
    )
    alice_ids = [
        _insert_notification(engine, recipient_id=alice_id)
        for _ in range(3)
    ]
    bob_id_notification = _insert_notification(engine, recipient_id=bob_id)

    response = client.patch("/api/v1/notifications/read", headers=alice_headers)
    assert response.status_code == 200
    assert response.json() == {"updatedCount": 3}
    assert client.patch(
        "/api/v1/notifications/read",
        headers=alice_headers,
    ).json() == {"updatedCount": 0}
    assert client.get(
        "/api/v1/notifications/unread-count",
        headers=alice_headers,
    ).json() == {"unreadCount": 0}
    bob_list = client.get(
        "/api/v1/notifications?status=unread",
        headers=bob_headers,
    ).json()["items"]
    assert [item["id"] for item in bob_list] == [str(bob_id_notification)]
    assert all(
        client.get(f"/api/v1/notifications/{item}", headers=alice_headers).json()[
            "readAt"
        ]
        for item in alice_ids
    )


def test_keyset_pagination_is_stable_and_bound_to_status(notification_api) -> None:
    client, delivery, engine = notification_api
    recipient_id, headers = _create_user(
        client, delivery, "notification-pagination@example.com"
    )
    for _ in range(6):
        _insert_notification(engine, recipient_id=recipient_id)

    first = client.get(
        "/api/v1/notifications?status=unread&limit=2",
        headers=headers,
    )
    assert first.status_code == 200
    cursor = first.json()["nextCursor"]
    assert cursor
    first_ids = {item["id"] for item in first.json()["items"]}
    newer_id = _insert_notification(
        engine,
        recipient_id=recipient_id,
        kind="playlist_updated",
    )

    second = client.get(
        "/api/v1/notifications",
        params={"status": "unread", "limit": 2, "cursor": cursor},
        headers=headers,
    )
    assert second.status_code == 200
    second_ids = {item["id"] for item in second.json()["items"]}
    assert first_ids.isdisjoint(second_ids)
    assert str(newer_id) not in second_ids
    assert len(second_ids) == 2
    assert client.get(
        "/api/v1/notifications",
        params={"status": "read", "cursor": cursor},
        headers=headers,
    ).json()["error"]["code"] == "INVALID_CURSOR"
    assert client.get(
        "/api/v1/notifications?limit=0",
        headers=headers,
    ).status_code == 422


def test_openapi_documents_utc_notification_example_without_public_producer_route(
    notification_api,
) -> None:
    client, _delivery, _engine = notification_api
    schema = client.get("/openapi.json").json()

    example = schema["components"]["schemas"]["NotificationResponse"]["example"]
    assert example["createdAt"].endswith("Z")
    assert schema["paths"]["/api/v1/notifications"]["get"]["responses"]["200"]
    assert "post" not in schema["paths"]["/api/v1/notifications"]


def test_duplicate_producer_delivery_is_idempotent_and_payload_conflicts_fail(
    notification_api,
) -> None:
    client, delivery, engine = notification_api
    recipient_id, _headers = _create_user(
        client, delivery, "notification-idempotency@example.com"
    )
    actor_id, _actor_headers = _create_user(
        client, delivery, "notification-idempotency-actor@example.com"
    )
    event_id = uuid4()
    destination = DestinationReference("profile", actor_id)

    with Session(engine) as db:
        original = create_notification(
            db,
            recipient_account_id=recipient_id,
            producer_event_id=event_id,
            kind="friend_request",
            actor_account_id=actor_id,
            destination=destination,
        )
        duplicate = create_notification(
            db,
            recipient_account_id=recipient_id,
            producer_event_id=event_id,
            kind="friend_request",
            actor_account_id=actor_id,
            destination=destination,
        )
        assert duplicate.id == original.id
        rows = db.scalars(
            select(Notification).where(
                Notification.recipient_account_id == recipient_id,
                Notification.producer_event_id == event_id,
            )
        ).all()
        assert len(rows) == 1
        with pytest.raises(NotificationIdempotencyConflict):
            create_notification(
                db,
                recipient_account_id=recipient_id,
                producer_event_id=event_id,
                kind="friend_accepted",
                actor_account_id=actor_id,
                destination=destination,
            )
        db.rollback()


def test_actor_summary_is_privacy_filtered_and_deleted_profile_destination_is_omitted(
    notification_api,
    caplog,
) -> None:
    client, delivery, engine = notification_api
    recipient_id, recipient_headers = _create_user(
        client, delivery, "notification-privacy-recipient@example.com"
    )
    actor_id, actor_headers = _create_user(
        client, delivery, "notification-privacy-actor@example.com"
    )
    created_profile = client.patch(
        "/api/v1/me/profile",
        headers=actor_headers,
        json={
            "displayName": "Private Actor",
            "username": "private_actor",
            "bio": "must not appear",
            "location": "hidden location",
        },
    )
    assert created_profile.status_code == 200
    notification_id = _insert_notification(
        engine,
        recipient_id=recipient_id,
        actor_id=actor_id,
        destination=DestinationReference("profile", actor_id),
    )

    access_token = recipient_headers["Authorization"].removeprefix("Bearer ")
    with caplog.at_level("DEBUG"):
        body = client.get(
            f"/api/v1/notifications/{notification_id}",
            headers=recipient_headers,
        ).json()
    assert access_token not in caplog.text
    assert "must not appear" not in caplog.text
    assert "hidden location" not in caplog.text
    assert body["actor"] == {
        "accountId": str(actor_id),
        "displayName": "Private Actor",
        "username": "private_actor",
    }
    assert "must not appear" not in str(body)
    assert "hidden location" not in str(body)
    assert "message" not in body

    with Session(engine) as db:
        db.delete(db.get(Profile, actor_id))
        db.commit()
    after_delete = client.get(
        f"/api/v1/notifications/{notification_id}",
        headers=recipient_headers,
    )
    assert after_delete.status_code == 200
    assert after_delete.json()["actor"] is None
    assert after_delete.json()["destination"] is None


def test_room_and_playlist_destinations_expose_only_typed_references(notification_api):
    client, delivery, engine = notification_api
    recipient_id, headers = _create_user(
        client, delivery, "notification-destination@example.com"
    )
    private_resource_id = uuid4()
    notification_id = _insert_notification(
        engine,
        recipient_id=recipient_id,
        kind="playlist_invitation",
        destination=DestinationReference("playlist", private_resource_id),
    )

    response = client.get(
        f"/api/v1/notifications/{notification_id}",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["destination"] == {
        "type": "playlist",
        "id": str(private_resource_id),
    }
    assert set(response.json()) == {
        "id",
        "kind",
        "actor",
        "destination",
        "createdAt",
        "readAt",
    }
    assert "title" not in response.json()
    assert "message" not in response.json()
