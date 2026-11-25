from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from pydantic import EmailStr, TypeAdapter, ValidationError


_EMAIL_ADAPTER = TypeAdapter(EmailStr)


class InvalidGoogleToken(Exception):
    pass


class GoogleProviderUnavailable(Exception):
    pass


@dataclass(frozen=True)
class VerifiedGoogleIdentity:
    subject: str
    email: str
    issued_at: datetime


def _google_request():
    from google.auth.transport.requests import Request

    class BoundedRequest(Request):
        def __call__(
            self,
            url: str,
            method: str = "GET",
            body: bytes | None = None,
            headers: dict[str, str] | None = None,
            timeout: float | None = None,
            **kwargs: Any,
        ) -> Any:
            return super().__call__(
                url,
                method=method,
                body=body,
                headers=headers,
                timeout=5,
                **kwargs,
            )

    return BoundedRequest()


def verify_google_id_token(
    token: str,
    server_client_id: str,
    ios_client_id: str,
) -> VerifiedGoogleIdentity:
    from google.auth.exceptions import TransportError
    from google.oauth2.id_token import verify_oauth2_token

    try:
        claims = verify_oauth2_token(
            token,
            _google_request(),
            audience=server_client_id,
        )
    except TransportError as exc:
        raise GoogleProviderUnavailable from exc
    except ValueError as exc:
        raise InvalidGoogleToken from exc

    if not isinstance(claims, Mapping):
        raise InvalidGoogleToken
    issuer = claims.get("iss")
    if not isinstance(issuer, str) or issuer not in {
        "accounts.google.com",
        "https://accounts.google.com",
    }:
        raise InvalidGoogleToken
    audience: Any = claims.get("aud")
    if audience != server_client_id and not (
        isinstance(audience, list) and server_client_id in audience
    ):
        raise InvalidGoogleToken
    authorized_party = claims.get("azp")
    if authorized_party is not None and authorized_party != ios_client_id:
        raise InvalidGoogleToken
    expires_at = claims.get("exp")
    if (
        isinstance(expires_at, bool)
        or not isinstance(expires_at, (int, float))
        or expires_at <= datetime.now(UTC).timestamp()
    ):
        raise InvalidGoogleToken
    issued_at = claims.get("iat")
    if (
        isinstance(issued_at, bool)
        or not isinstance(issued_at, (int, float))
        or issued_at > datetime.now(UTC).timestamp() + 60
    ):
        raise InvalidGoogleToken
    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject or len(subject) > 255:
        raise InvalidGoogleToken
    if claims.get("email_verified") is not True:
        raise InvalidGoogleToken
    email = claims.get("email")
    if not isinstance(email, str):
        raise InvalidGoogleToken
    try:
        canonical_email = str(_EMAIL_ADAPTER.validate_python(email)).lower()
    except ValidationError as exc:
        raise InvalidGoogleToken from exc
    return VerifiedGoogleIdentity(
        subject=subject,
        email=canonical_email,
        issued_at=datetime.fromtimestamp(issued_at, UTC),
    )
