from datetime import UTC, datetime, timedelta
from typing import Callable
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.google import (
    GoogleProviderUnavailable,
    InvalidGoogleToken,
    VerifiedGoogleIdentity,
)
from app.auth.email import InMemoryEmailDelivery
from app.auth.models import Account, AuthIdentity, AuthSession
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db_engine
from app.main import create_app


IOS_CLIENT_ID = "test-google-ios-client"
SERVER_CLIENT_ID = "test-google-server-client"


@pytest.fixture
def auth_api():
    settings = get_settings()
    engine = get_db_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    delivery = InMemoryEmailDelivery()
    app = create_app(settings, email_delivery=delivery)
    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield client, app, delivery, engine
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def bearer(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def register(client: TestClient, delivery, email: str) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "passphrase-one"},
    )
    assert response.status_code == 201, response.text
    message = delivery.messages[-1]
    verified = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": email,
            "challengeId": response.json()["challengeId"],
            "code": message.code,
        },
    )
    assert verified.status_code == 200, verified.text


def login(client: TestClient, email: str) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "passphrase-one"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def configure_google(
    app: object,
    verifier: Callable[[str, str, str], VerifiedGoogleIdentity],
) -> None:
    app.state.settings = app.state.settings.model_copy(
        update={
            "google_ios_client_id": IOS_CLIENT_ID,
            "google_server_client_id": SERVER_CLIENT_ID,
        }
    )
    app.state.google_token_verifier = verifier


def identity_verifier(
    token: str,
    server_client_id: str,
    ios_client_id: str,
) -> VerifiedGoogleIdentity:
    assert server_client_id == SERVER_CLIENT_ID
    assert ios_client_id == IOS_CLIENT_ID
    if token == "invalid":
        raise InvalidGoogleToken
    if token == "provider-down":
        raise GoogleProviderUnavailable
    if token == "new-google":
        return VerifiedGoogleIdentity(
            "sub-new",
            "google@example.com",
            datetime.now(UTC),
        )
    if token == "shared-google":
        return VerifiedGoogleIdentity(
            "sub-shared",
            "shared@example.com",
            datetime.now(UTC),
        )
    if token == "social-only":
        return VerifiedGoogleIdentity(
            "sub-social-only",
            "social@example.com",
            datetime.now(UTC),
        )
    if token == "stale-google":
        return VerifiedGoogleIdentity(
            "sub-social-only",
            "social@example.com",
            datetime.now(UTC) - timedelta(minutes=6),
        )
    raise InvalidGoogleToken


def test_google_endpoint_requires_configuration_and_handles_verifier_errors(
    auth_api,
) -> None:
    client, app, _delivery, _engine = auth_api
    app.state.settings = app.state.settings.model_copy(
        update={
            "google_ios_client_id": None,
            "google_server_client_id": None,
        }
    )
    app.state.google_token_verifier = lambda *_args: (_ for _ in ()).throw(
        AssertionError("unconfigured verifier must not be called")
    )
    response = client.post("/api/v1/auth/google", json={"idToken": "token"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "GOOGLE_AUTH_NOT_CONFIGURED"

    configure_google(app, identity_verifier)
    invalid = client.post("/api/v1/auth/google", json={"idToken": "invalid"})
    assert invalid.status_code == 401
    assert invalid.json()["error"]["code"] == "INVALID_GOOGLE_TOKEN"

    unavailable = client.post(
        "/api/v1/auth/google",
        json={"idToken": "provider-down"},
    )
    assert unavailable.status_code == 503
    assert unavailable.json()["error"]["code"] == "GOOGLE_PROVIDER_UNAVAILABLE"


def test_google_sign_in_creates_account_and_authenticates_existing_identity(
    auth_api,
) -> None:
    client, app, _delivery, engine = auth_api
    configure_google(app, identity_verifier)

    created = client.post(
        "/api/v1/auth/google",
        json={"idToken": "new-google"},
    )
    assert created.status_code == 200, created.text
    first = created.json()
    assert first["account"]["email"] == "google@example.com"
    assert first["account"]["emailVerified"] is True
    assert first["accessToken"]
    with Session(engine) as db:
        account = db.scalar(select(Account).where(Account.email == "google@example.com"))
        assert account is not None
        assert account.password_hash is None
        identity = db.scalar(
            select(AuthIdentity).where(AuthIdentity.subject == "sub-new")
        )
        assert identity is not None
        assert identity.account_id == account.id

    again = client.post(
        "/api/v1/auth/google",
        json={"idToken": "new-google"},
    )
    assert again.status_code == 200
    assert again.json()["account"]["id"] == first["account"]["id"]
    with Session(engine) as db:
        assert db.scalar(select(func.count(Account.id))) == 1


def test_verified_email_collision_requires_explicit_link(auth_api) -> None:
    client, app, delivery, engine = auth_api
    configure_google(app, identity_verifier)
    register(client, delivery, "shared@example.com")

    collision = client.post(
        "/api/v1/auth/google",
        json={"idToken": "shared-google"},
    )

    assert collision.status_code == 409
    assert collision.json()["error"]["code"] == "ACCOUNT_LINK_REQUIRED"
    assert collision.json()["error"]["details"]["linkRequired"] is True
    assert collision.json()["error"]["details"]["linkEndpoint"] == (
        "/api/v1/me/linked-accounts/google"
    )
    with Session(engine) as db:
        assert db.scalar(select(func.count(Account.id))) == 1
        assert db.scalar(select(func.count(AuthIdentity.id))) == 0


def test_linking_revokes_other_sessions_and_unlinking_preserves_password_login(
    auth_api,
) -> None:
    client, app, delivery, engine = auth_api
    configure_google(app, identity_verifier)
    register(client, delivery, "person@example.com")
    current = login(client, "person@example.com")
    other_session = login(client, "person@example.com")

    anonymous = client.post(
        "/api/v1/me/linked-accounts/google",
        json={"idToken": "shared-google", "currentPassword": "passphrase-one"},
    )
    assert anonymous.status_code == 401

    bad_reauth = client.post(
        "/api/v1/me/linked-accounts/google",
        headers=bearer(current["accessToken"]),
        json={"idToken": "shared-google", "currentPassword": "wrong-password"},
    )
    assert bad_reauth.status_code == 401

    linked = client.post(
        "/api/v1/me/linked-accounts/google",
        headers=bearer(current["accessToken"]),
        json={"idToken": "shared-google", "currentPassword": "passphrase-one"},
    )
    assert linked.status_code == 200, linked.text
    assert linked.json()["account"]["id"] == current["account"]["id"]
    assert client.get(
        "/api/v1/me",
        headers=bearer(current["accessToken"]),
    ).status_code == 401
    assert client.get(
        "/api/v1/me",
        headers=bearer(other_session["accessToken"]),
    ).status_code == 401
    revoked_refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": other_session["refreshToken"]},
    )
    assert revoked_refresh.status_code == 401
    assert revoked_refresh.json()["error"]["code"] == "SESSION_REVOKED"
    active_access = linked.json()["accessToken"]

    methods = client.get(
        "/api/v1/me/linked-accounts",
        headers=bearer(active_access),
    )
    assert methods.status_code == 200
    assert methods.json() == {"passwordEnabled": True, "googleLinked": True}

    register(client, delivery, "second@example.com")
    second_account = login(client, "second@example.com")
    stolen_link = client.post(
        "/api/v1/me/linked-accounts/google",
        headers=bearer(second_account["accessToken"]),
        json={"idToken": "shared-google", "currentPassword": "passphrase-one"},
    )
    assert stolen_link.status_code == 409
    assert stolen_link.json()["error"]["code"] == "GOOGLE_IDENTITY_IN_USE"

    unlinked = client.post(
        "/api/v1/me/linked-accounts/google/unlink",
        headers=bearer(active_access),
        json={"currentPassword": "passphrase-one"},
    )
    assert unlinked.status_code == 200, unlinked.text
    assert client.get(
        "/api/v1/me/linked-accounts",
        headers=bearer(unlinked.json()["accessToken"]),
    ).json() == {"passwordEnabled": True, "googleLinked": False}
    assert client.get(
        "/api/v1/me",
        headers=bearer(active_access),
    ).status_code == 401
    with Session(engine) as db:
        assert db.scalar(select(AuthIdentity.id)) is None
        sessions = db.scalars(
            select(AuthSession).where(
                AuthSession.account_id == UUID(current["account"]["id"])
            )
        ).all()
        assert sessions
        assert sum(session.revoked_at is None for session in sessions) == 1


def test_google_only_account_cannot_unlink_its_last_login_method(auth_api) -> None:
    client, app, _delivery, _engine = auth_api
    configure_google(app, identity_verifier)
    signed_in = client.post(
        "/api/v1/auth/google",
        json={"idToken": "social-only"},
    )
    assert signed_in.status_code == 200

    response = client.post(
        "/api/v1/me/linked-accounts/google/unlink",
        headers=bearer(signed_in.json()["accessToken"]),
        json={"idToken": "stale-google"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "REAUTHENTICATION_REQUIRED"

    response = client.post(
        "/api/v1/me/linked-accounts/google/unlink",
        headers=bearer(signed_in.json()["accessToken"]),
        json={"idToken": "social-only"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LAST_LOGIN_METHOD"
    methods = client.get(
        "/api/v1/me/linked-accounts",
        headers=bearer(signed_in.json()["accessToken"]),
    )
    assert methods.status_code == 200
    assert methods.json() == {"passwordEnabled": False, "googleLinked": True}


def test_google_openapi_documents_only_approved_native_provider(auth_api) -> None:
    client, _app, _delivery, _engine = auth_api
    schema = client.get("/openapi.json").json()

    google_sign_in = schema["paths"]["/api/v1/auth/google"]["post"]
    request_schema = schema["components"]["schemas"]["GoogleSignInRequest"]
    assert request_schema["properties"]["idToken"]["examples"] == [
        "<google-id-token-from-ios>"
    ]
    assert (
        google_sign_in["responses"]["409"]["content"]["application/json"]["example"][
            "error"
        ]["code"]
        == "ACCOUNT_LINK_REQUIRED"
    )
    assert "/api/v1/me/linked-accounts/google" in schema["paths"]
    assert "/api/v1/me/linked-accounts/google/unlink" in schema["paths"]
    assert not any("facebook" in path.lower() for path in schema["paths"])
