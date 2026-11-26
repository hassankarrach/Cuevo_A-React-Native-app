from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.email import AuthEmail, EmailDeliveryError, InMemoryEmailDelivery
from app.auth.models import (
    Account,
    AuthChallenge,
    AuthRefreshToken,
    AuthSession,
)
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, get_db_engine
from app.main import create_app


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


def register(client: TestClient, email: str = "person@example.com") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "passphrase-one"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def verify_registered(client: TestClient, delivery: InMemoryEmailDelivery) -> dict:
    challenge = register(client)
    message = delivery.messages[-1]
    verified = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "person@example.com",
            "challengeId": challenge["challengeId"],
            "code": message.code,
        },
    )
    assert verified.status_code == 200, verified.text
    return verified.json()


def login(client: TestClient, password: str = "passphrase-one") -> dict:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()


def bearer(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def test_registration_verification_login_me_refresh_and_logout(auth_api) -> None:
    client, _app, delivery, _engine = auth_api
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "  PERSON@Example.com ", "password": "passphrase-one"},
    )

    assert response.status_code == 201
    registration = response.json()
    assert registration["account"]["email"] == "person@example.com"
    assert registration["account"]["emailVerified"] is False
    assert registration["account"]["profileCompleted"] is False
    assert registration["account"]["onboardingStep"] == "VERIFY_EMAIL"
    assert registration["maskedEmail"] == "p*****@example.com"
    assert registration["expiresAt"] > registration["resendAvailableAt"]
    assert "passwordHash" not in response.text
    assert delivery.messages[0].code not in response.text

    unverified_login = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "passphrase-one"},
    )
    assert unverified_login.status_code == 403
    assert unverified_login.json()["error"]["code"] == "EMAIL_NOT_VERIFIED"
    assert client.get("/api/v1/me").status_code == 401

    message = delivery.messages[0]
    verified = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "person@example.com",
            "challengeId": registration["challengeId"],
            "code": message.code,
        },
    )
    assert verified.status_code == 200
    assert verified.json()["emailVerified"] is True
    assert verified.json()["profileCompleted"] is False
    assert verified.json()["onboardingStep"] == "SET_UP_PROFILE"

    logged_in = login(client)
    access_token = logged_in["accessToken"]
    old_refresh_token = logged_in["refreshToken"]
    me = client.get("/api/v1/me", headers=bearer(access_token))
    assert me.status_code == 200
    assert me.json()["id"] == verified.json()["id"]

    rotated = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": old_refresh_token},
    )
    assert rotated.status_code == 200
    assert rotated.json()["refreshToken"] != old_refresh_token
    assert client.get("/api/v1/me", headers=bearer(access_token)).status_code == 401

    replay = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": old_refresh_token},
    )
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "SESSION_REVOKED"
    assert (
        client.get(
            "/api/v1/me",
            headers=bearer(rotated.json()["accessToken"]),
        ).json()["error"]["code"]
        == "SESSION_REVOKED"
    )

    second_login = login(client)
    logout_response = client.post(
        "/api/v1/auth/logout",
        headers=bearer(second_login["accessToken"]),
    )
    assert logout_response.status_code == 204
    assert (
        client.get(
            "/api/v1/me",
            headers=bearer(second_login["accessToken"]),
        ).json()["error"]["code"]
        == "SESSION_REVOKED"
    )


def test_duplicate_registration_invalid_credentials_and_unverified_policy(auth_api) -> None:
    client, _app, _delivery, engine = auth_api
    register(client)
    duplicate = client.post(
        "/api/v1/auth/register",
        json={"email": "PERSON@example.com", "password": "passphrase-one"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "EMAIL_ALREADY_USED"

    invalid_credentials = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "wrong-passphrase"},
    )
    assert invalid_credentials.status_code == 401
    assert invalid_credentials.json()["error"]["code"] == "INVALID_CREDENTIALS"

    unverified_login = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "passphrase-one"},
    )
    assert unverified_login.status_code == 403
    assert unverified_login.json()["error"]["code"] == "EMAIL_NOT_VERIFIED"
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Account)) == 1


def test_concurrent_duplicate_registration_uses_postgres_uniqueness(auth_api) -> None:
    _client, app, _delivery, engine = auth_api

    def register_once() -> tuple[int, dict]:
        with TestClient(app, raise_server_exceptions=False) as concurrent_client:
            response = concurrent_client.post(
                "/api/v1/auth/register",
                json={
                    "email": "concurrent@example.com",
                    "password": "passphrase-one",
                },
            )
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _index: register_once(), range(2)))

    assert sorted(status_code for status_code, _ in results) == [201, 409]
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Account)) == 1


def test_account_onboarding_state_is_persisted_separately(auth_api) -> None:
    client, _app, delivery, _engine = auth_api
    verify_registered(client, delivery)
    session = login(client)
    profile = client.patch(
        "/api/v1/me/profile",
        headers=bearer(session["accessToken"]),
        json={"displayName": "Onboarding User", "username": "onboarding_user"},
    )
    assert profile.status_code == 200
    completed = client.post(
        "/api/v1/me/onboarding/profile-completed",
        headers=bearer(session["accessToken"]),
    )
    assert completed.status_code == 200
    assert completed.json()["emailVerified"] is True
    assert completed.json()["profileCompleted"] is True
    assert completed.json()["onboardingStep"] == "HOME"
    assert client.get(
        "/api/v1/me",
        headers=bearer(session["accessToken"]),
    ).json()["profileCompleted"] is True


def test_expired_access_session_is_rejected(auth_api) -> None:
    client, _app, delivery, _engine = auth_api
    verify_registered(client, delivery)
    tokens = login(client)
    now = datetime.now(UTC)
    with SessionLocal() as db:
        session = db.scalar(select(AuthSession))
        assert session is not None
        session.created_at = now - timedelta(minutes=20)
        session.access_expires_at = now - timedelta(seconds=1)
        db.commit()
    expired = client.get(
        "/api/v1/me",
        headers=bearer(tokens["accessToken"]),
    )
    assert expired.status_code == 401
    assert expired.json()["error"]["code"] == "SESSION_EXPIRED"


def test_expired_refresh_session_is_revoked(auth_api) -> None:
    client, _app, delivery, _engine = auth_api
    verify_registered(client, delivery)
    tokens = login(client)
    now = datetime.now(UTC)
    with SessionLocal() as db:
        token = db.scalar(select(AuthRefreshToken))
        assert token is not None
        token.created_at = now - timedelta(days=31)
        token.expires_at = now - timedelta(seconds=1)
        db.commit()
    expired = client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": tokens["refreshToken"]},
    )
    assert expired.status_code == 401
    assert expired.json()["error"]["code"] == "SESSION_EXPIRED"


def test_login_rate_limit_is_database_enforced(auth_api) -> None:
    client, _app, _delivery, _engine = auth_api
    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "rate@example.com", "password": "wrong-passphrase"},
        )
        assert response.status_code == 401
    limited = client.post(
        "/api/v1/auth/login",
        json={"email": "rate@example.com", "password": "wrong-passphrase"},
    )
    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "RATE_LIMITED"
    assert int(limited.headers["Retry-After"]) > 0


def test_reset_delivery_failure_does_not_enumerate_or_log_active_code(
    auth_api, caplog
) -> None:
    client, app, delivery, _engine = auth_api
    verify_registered(client, delivery)

    class FailingDelivery:
        message: AuthEmail | None = None

        def send_challenge(self, message: AuthEmail) -> None:
            self.message = message
            raise EmailDeliveryError(message.code)

    failing_delivery = FailingDelivery()
    app.state.email_delivery = failing_delivery
    unknown = client.post(
        "/api/v1/auth/password/reset/request",
        json={"email": "missing@example.com"},
    )
    known = client.post(
        "/api/v1/auth/password/reset/request",
        json={"email": "person@example.com"},
    )
    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    assert failing_delivery.message is not None
    assert failing_delivery.message.code not in caplog.text


def test_reset_is_non_enumerating_one_use_and_revokes_sessions(auth_api) -> None:
    client, _app, delivery, _engine = auth_api
    verify_registered(client, delivery)
    first_session = login(client)
    second_session = login(client)

    known = client.post(
        "/api/v1/auth/password/reset/request",
        json={"email": "person@example.com"},
    )
    unknown = client.post(
        "/api/v1/auth/password/reset/request",
        json={"email": "nobody@example.com"},
    )
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert delivery.messages[-1].purpose == "password_reset"
    reset_code = delivery.messages[-1].code

    confirmed = client.post(
        "/api/v1/auth/password/reset/confirm",
        json={
            "email": "person@example.com",
            "code": reset_code,
            "password": "passphrase-two",
        },
    )
    assert confirmed.status_code == 200
    assert confirmed.json() == {"changed": True}
    for session in (first_session, second_session):
        response = client.get(
            "/api/v1/me",
            headers=bearer(session["accessToken"]),
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "SESSION_REVOKED"

    reused = client.post(
        "/api/v1/auth/password/reset/confirm",
        json={
            "email": "person@example.com",
            "code": reset_code,
            "password": "passphrase-three",
        },
    )
    assert reused.status_code == 400
    assert reused.json()["error"]["code"] == "CODE_ALREADY_USED"
    assert login(client, "passphrase-two")["accessToken"]


def test_password_change_rotates_current_session_and_revokes_others(auth_api) -> None:
    client, _app, delivery, _engine = auth_api
    verify_registered(client, delivery)
    current = login(client)
    other = login(client)

    changed = client.put(
        "/api/v1/me/password",
        headers=bearer(current["accessToken"]),
        json={
            "currentPassword": "passphrase-one",
            "newPassword": "passphrase-two",
        },
    )
    assert changed.status_code == 200
    assert changed.json()["refreshToken"] != current["refreshToken"]
    assert (
        client.get(
            "/api/v1/me",
            headers=bearer(current["accessToken"]),
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/v1/me",
            headers=bearer(other["accessToken"]),
        ).json()["error"]["code"]
        == "SESSION_REVOKED"
    )
    assert client.get(
        "/api/v1/me",
        headers=bearer(changed.json()["accessToken"]),
    ).status_code == 200
    assert login(client, "passphrase-two")["accessToken"]


def test_challenge_expiry_attempt_cap_and_resend_cooldown(auth_api) -> None:
    client, _app, delivery, engine = auth_api
    registration = register(client)
    resend = client.post(
        "/api/v1/auth/email/resend",
        json={"email": "person@example.com"},
    )
    assert resend.status_code == 429
    assert int(resend.headers["Retry-After"]) > 0
    assert int(resend.headers["Retry-After"]) <= 30

    for _ in range(5):
        response = client.post(
            "/api/v1/auth/email/verify",
            json={
                "email": "person@example.com",
                "challengeId": registration["challengeId"],
                "code": "000000",
            },
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "CODE_INVALID"
    exhausted = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "person@example.com",
            "challengeId": registration["challengeId"],
            "code": delivery.messages[0].code,
        },
    )
    assert exhausted.status_code == 400
    assert exhausted.json()["error"]["code"] == "CODE_ALREADY_USED"

    another = client.post(
        "/api/v1/auth/register",
        json={"email": "expired@example.com", "password": "passphrase-one"},
    )
    assert another.status_code == 201
    with SessionLocal() as db:
        challenge = db.get(AuthChallenge, another.json()["challengeId"])
        assert challenge is not None
        now = datetime.now(UTC)
        challenge.created_at = now - timedelta(minutes=16)
        challenge.expires_at = now - timedelta(seconds=1)
        db.commit()
    expired = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "expired@example.com",
            "challengeId": another.json()["challengeId"],
            "code": delivery.messages[-1].code,
        },
    )
    assert expired.status_code == 400
    assert expired.json()["error"]["code"] == "CODE_EXPIRED"

    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(AuthChallenge)) == 2


def test_resend_metadata_is_non_enumerating_and_resumable(auth_api) -> None:
    client, _app, delivery, engine = auth_api
    registration = register(client, "eligible@example.com")
    with Session(engine) as db:
        challenge = db.get(AuthChallenge, registration["challengeId"])
        assert challenge is not None
        challenge.resend_available_at = datetime.now(UTC) - timedelta(seconds=1)
        db.commit()

    eligible = client.post(
        "/api/v1/auth/email/resend",
        json={"email": "eligible@example.com"},
    )
    assert eligible.status_code == 202
    assert set(eligible.json()) == {
        "accepted",
        "message",
        "challengeId",
        "expiresAt",
        "resendAvailableAt",
    }
    assert eligible.json()["accepted"] is True
    assert eligible.json()["message"] == (
        "If the account can receive a verification email, instructions will be sent."
    )
    assert eligible.json()["challengeId"] != registration["challengeId"]
    assert delivery.messages[-1].challenge_id == eligible.json()["challengeId"]
    assert datetime.fromisoformat(
        delivery.messages[-1].expires_at
    ) == datetime.fromisoformat(eligible.json()["expiresAt"])
    assert datetime.fromisoformat(eligible.json()["expiresAt"]) > datetime.fromisoformat(
        eligible.json()["resendAvailableAt"]
    )
    with Session(engine) as db:
        replacement = db.get(AuthChallenge, eligible.json()["challengeId"])
        assert replacement is not None
        assert replacement.expires_at == datetime.fromisoformat(
            eligible.json()["expiresAt"]
        )
        assert replacement.resend_available_at == datetime.fromisoformat(
            eligible.json()["resendAvailableAt"]
        )

    replacement_id = eligible.json()["challengeId"]
    new_code = delivery.messages[-1].code
    old_code = delivery.messages[0].code
    old_id_attempt = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "eligible@example.com",
            "challengeId": registration["challengeId"],
            "code": new_code,
        },
    )
    assert old_id_attempt.status_code == 400
    wrong_code_attempt = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "eligible@example.com",
            "challengeId": replacement_id,
            "code": old_code,
        },
    )
    assert wrong_code_attempt.status_code == 400
    verified = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "eligible@example.com",
            "challengeId": replacement_id,
            "code": new_code,
        },
    )
    assert verified.status_code == 200
    assert verified.json()["emailVerified"] is True

    verified_registration = register(client, "already-verified@example.com")
    verified_account = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "already-verified@example.com",
            "challengeId": verified_registration["challengeId"],
            "code": delivery.messages[-1].code,
        },
    )
    assert verified_account.status_code == 200
    already_verified = client.post(
        "/api/v1/auth/email/resend",
        json={"email": "already-verified@example.com"},
    )
    unknown = client.post(
        "/api/v1/auth/email/resend",
        json={"email": "unknown@example.com"},
    )
    assert already_verified.status_code == unknown.status_code == 202
    assert set(already_verified.json()) == set(unknown.json()) == set(eligible.json())
    assert already_verified.json()["message"] == unknown.json()["message"]
    assert "account" not in already_verified.json()
    assert "maskedEmail" not in already_verified.json()
    assert "account" not in unknown.json()
    assert "maskedEmail" not in unknown.json()
    for response in (already_verified, unknown):
        created_at = datetime.now(UTC)
        expires_at = datetime.fromisoformat(response.json()["expiresAt"])
        resend_at = datetime.fromisoformat(response.json()["resendAvailableAt"])
        assert (
            timedelta(seconds=895)
            <= expires_at - created_at
            <= timedelta(minutes=15)
        )
        assert timedelta(seconds=25) <= resend_at - created_at <= timedelta(seconds=30)
        with Session(engine) as db:
            assert db.get(AuthChallenge, response.json()["challengeId"]) is None
        fake_verify = client.post(
            "/api/v1/auth/email/verify",
            json={
                "email": (
                    "already-verified@example.com"
                    if response is already_verified
                    else "unknown@example.com"
                ),
                "challengeId": response.json()["challengeId"],
                "code": "000000",
            },
        )
        assert fake_verify.status_code == 400
        assert fake_verify.json()["error"]["code"] == "CODE_INVALID"


def test_simultaneous_refresh_is_single_use_and_replay_revokes_family(auth_api) -> None:
    client, app, delivery, _engine = auth_api
    verify_registered(client, delivery)
    initial = login(client)

    def refresh_once() -> tuple[int, dict]:
        with TestClient(app, raise_server_exceptions=False) as concurrent_client:
            response = concurrent_client.post(
                "/api/v1/auth/refresh",
                json={"refreshToken": initial["refreshToken"]},
            )
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _index: refresh_once(), range(2)))

    assert sorted(status_code for status_code, _ in results) == [200, 401]
    winner = next(body for status_code, body in results if status_code == 200)
    loser = next(body for status_code, body in results if status_code == 401)
    assert loser["error"]["code"] == "SESSION_REVOKED"
    assert (
        client.get(
            "/api/v1/me",
            headers=bearer(winner["accessToken"]),
        ).json()["error"]["code"]
        == "SESSION_REVOKED"
    )


def test_database_stores_only_password_and_token_digests(auth_api) -> None:
    client, _app, delivery, engine = auth_api
    registration = register(client)
    challenge = delivery.messages[-1]

    with Session(engine) as db:
        account = db.scalar(select(Account).where(Account.email == "person@example.com"))
        stored_challenge = db.get(AuthChallenge, registration["challengeId"])
        assert account is not None and stored_challenge is not None
        assert account.password_hash.startswith("$argon2id$")
        assert account.password_hash != "passphrase-one"
        assert stored_challenge.code_digest != challenge.code
        assert challenge.code not in stored_challenge.code_digest

    verified = client.post(
        "/api/v1/auth/email/verify",
        json={
            "email": "person@example.com",
            "challengeId": registration["challengeId"],
            "code": challenge.code,
        },
    )
    assert verified.status_code == 200
    tokens = login(client)
    with Session(engine) as db:
        session = db.scalar(select(AuthSession))
        token = db.scalar(select(AuthRefreshToken))
        assert session is not None and token is not None
        assert tokens["accessToken"] not in session.access_token_digest
        assert tokens["refreshToken"] not in token.token_digest
