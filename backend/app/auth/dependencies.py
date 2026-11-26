from dataclasses import dataclass
from datetime import datetime
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.errors import APIError
from app.auth.models import Account, AuthSession
from app.auth.security import keyed_digest, utc_now
from app.db.session import get_db


bearer_auth = HTTPBearer(auto_error=False, scheme_name="BearerAuth")


@dataclass(frozen=True)
class Principal:
    account: Account
    session: AuthSession


def current_principal(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_auth),
    ] = None,
    db: Session = Depends(get_db),
) -> Principal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise APIError(
            401,
            "AUTHENTICATION_REQUIRED",
            "Authentication is required.",
        )
    token = credentials.credentials.strip()
    if not token or len(token) > 128:
        raise APIError(
            401,
            "AUTHENTICATION_REQUIRED",
            "Authentication is required.",
        )
    settings = request.app.state.settings
    digest = keyed_digest(settings, "access-token", token)
    result = db.execute(
        select(AuthSession, Account)
        .join(Account, Account.id == AuthSession.account_id)
        .where(AuthSession.access_token_digest == digest)
    ).first()
    if result is None:
        raise APIError(
            401,
            "AUTHENTICATION_REQUIRED",
            "Authentication is required.",
        )
    session, account = result
    now: datetime = utc_now()
    if session.revoked_at is not None:
        raise APIError(401, "SESSION_REVOKED", "The session is no longer active.")
    if session.absolute_expires_at <= now or session.access_expires_at <= now:
        raise APIError(401, "SESSION_EXPIRED", "The session has expired.")
    return Principal(account=account, session=session)
