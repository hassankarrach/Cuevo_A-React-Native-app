from datetime import UTC, datetime, timedelta

import pytest
from google.auth.exceptions import TransportError
from google.oauth2 import id_token as google_id_token

from app.auth.google import (
    GoogleProviderUnavailable,
    InvalidGoogleToken,
    verify_google_id_token,
)


IOS_CLIENT_ID = "ios-client-id"
SERVER_CLIENT_ID = "server-client-id"


def valid_claims(**overrides: object) -> dict[str, object]:
    claims: dict[str, object] = {
        "iss": "https://accounts.google.com",
        "aud": SERVER_CLIENT_ID,
        "azp": IOS_CLIENT_ID,
        "exp": (datetime.now(UTC) + timedelta(minutes=5)).timestamp(),
        "iat": datetime.now(UTC).timestamp(),
        "sub": "google-subject-123",
        "email": "Person@Example.com",
        "email_verified": True,
    }
    claims.update(overrides)
    return claims


def test_google_token_verification_uses_server_audience_and_verified_claims(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, str]] = []

    def fake_verify(
        _token: str,
        _request: object,
        *,
        audience: str,
    ) -> dict[str, object]:
        calls.append(("audience", audience))
        return valid_claims()

    monkeypatch.setattr(google_id_token, "verify_oauth2_token", fake_verify)

    identity = verify_google_id_token("signed-token", SERVER_CLIENT_ID, IOS_CLIENT_ID)

    assert identity.subject == "google-subject-123"
    assert identity.email == "person@example.com"
    assert identity.issued_at.tzinfo == UTC
    assert calls == [("audience", SERVER_CLIENT_ID)]


@pytest.mark.parametrize(
    "claims",
    [
        {"iss": "https://attacker.example"},
        {"aud": "another-client-id"},
        {"azp": "another-ios-client-id"},
        {"exp": (datetime.now(UTC) - timedelta(minutes=1)).timestamp()},
        {"email_verified": False},
        {"sub": ""},
        {"email": "not-an-email"},
    ],
)
def test_google_token_verification_rejects_invalid_claims(
    monkeypatch: pytest.MonkeyPatch,
    claims: dict[str, object],
) -> None:
    monkeypatch.setattr(
        google_id_token,
        "verify_oauth2_token",
        lambda *_args, **_kwargs: valid_claims(**claims),
    )

    with pytest.raises(InvalidGoogleToken):
        verify_google_id_token("signed-token", SERVER_CLIENT_ID, IOS_CLIENT_ID)


def test_google_token_verification_rejects_bad_signature(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def reject_signature(*_args: object, **_kwargs: object) -> None:
        raise ValueError("invalid signature")

    monkeypatch.setattr(google_id_token, "verify_oauth2_token", reject_signature)

    with pytest.raises(InvalidGoogleToken):
        verify_google_id_token("tampered-token", SERVER_CLIENT_ID, IOS_CLIENT_ID)


def test_google_certificate_outage_is_distinct_from_invalid_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_request(*_args: object, **_kwargs: object) -> None:
        raise TransportError("provider unavailable")

    monkeypatch.setattr(google_id_token, "verify_oauth2_token", fail_request)

    with pytest.raises(GoogleProviderUnavailable):
        verify_google_id_token("signed-token", SERVER_CLIENT_ID, IOS_CLIENT_ID)
