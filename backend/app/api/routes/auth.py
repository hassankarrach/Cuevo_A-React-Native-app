import logging
import secrets
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.errors import APIError
from app.auth.email import AuthEmail, EmailDelivery, EmailDeliveryError
from app.auth.models import Account, AuthChallenge, AuthRefreshToken, AuthSession
from app.auth.rate_limits import RateLimit, client_ip, enforce_rate_limits
from app.auth.schemas import (
    AcceptedResponse,
    AccountState,
    AuthTokensResponse,
    ChallengeResponse,
    LoginRequest,
    PasswordChangeRequest,
    PasswordResetConfirmRequest,
    PasswordResetConfirmedResponse,
    PasswordResetRequestedResponse,
    RefreshRequest,
    RegisterRequest,
    ResendEmailRequest,
    VerifyEmailRequest,
)
from app.auth.security import (
    ACCESS_TOKEN_LIFETIME,
    CHALLENGE_ATTEMPT_LIMIT,
    CHALLENGE_LIFETIME,
    RESEND_COOLDOWN,
    SESSION_ABSOLUTE_LIFETIME,
    hash_password,
    keyed_digest,
    masked_email,
    new_access_token,
    new_challenge_code,
    new_refresh_token,
    password_hash_needs_rehash,
    refresh_expiry,
    utc_now,
    verify_dummy_password,
    verify_password,
)
from app.core.config import Settings
from app.db.session import get_db


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["authentication"])
bearer_auth = HTTPBearer(auto_error=False, scheme_name="BearerAuth")


@dataclass(frozen=True)
class Principal:
    account: Account
    session: AuthSession


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _email_delivery(request: Request) -> EmailDelivery:
    return request.app.state.email_delivery


def _account_state(account: Account) -> AccountState:
    email_verified = account.email_verified_at is not None
    if not email_verified:
        onboarding_step = "VERIFY_EMAIL"
    elif not account.profile_completed:
        onboarding_step = "SET_UP_PROFILE"
    else:
        onboarding_step = "HOME"
    return AccountState(
        id=account.id,
        email=account.email,
        email_verified=email_verified,
        profile_completed=account.profile_completed,
        onboarding_step=onboarding_step,
        created_at=account.created_at,
    )


def _ip_limit(name: str, request: Request, maximum: int, window: int) -> RateLimit:
    return RateLimit(name, client_ip(request), maximum, window)


def _email_limit(
    name: str, email: str, maximum: int, window: int
) -> RateLimit:
    return RateLimit(name, email, maximum, window)


def _new_challenge(
    db: Session,
    settings: Settings,
    account: Account,
    purpose: str,
    *,
    now: datetime,
) -> tuple[AuthChallenge, str]:
    previous = db.scalars(
        select(AuthChallenge)
        .where(
            AuthChallenge.account_id == account.id,
            AuthChallenge.purpose == purpose,
            AuthChallenge.consumed_at.is_(None),
        )
        .with_for_update()
    ).all()
    for challenge in previous:
        challenge.consumed_at = now

    challenge_id = uuid4()
    code = new_challenge_code()
    challenge = AuthChallenge(
        id=challenge_id,
        account_id=account.id,
        purpose=purpose,
        code_digest=keyed_digest(
            settings,
            "auth-challenge",
            f"{purpose}:{challenge_id}:{code}",
        ),
        created_at=now,
        expires_at=now + CHALLENGE_LIFETIME,
        resend_available_at=now + RESEND_COOLDOWN,
    )
    db.add(challenge)
    db.flush()
    return challenge, code


def _deliver_challenge(
    delivery: EmailDelivery,
    account: Account,
    challenge: AuthChallenge,
    code: str,
) -> None:
    _send_challenge(
        delivery,
        AuthEmail(
            recipient=account.email,
            purpose=challenge.purpose,
            challenge_id=str(challenge.id),
            code=code,
            expires_at=challenge.expires_at.isoformat(),
        ),
    )


def _send_challenge(delivery: EmailDelivery, message: AuthEmail) -> None:
    delivery.send_challenge(message)


def _send_challenge_non_enumerating(
    delivery: EmailDelivery,
    message: AuthEmail,
) -> None:
    try:
        _send_challenge(delivery, message)
    except EmailDeliveryError as exc:
        logger.warning(
            "Authentication email delivery failed; exception_type=%s",
            type(exc).__name__,
        )


def _create_tokens(
    db: Session,
    settings: Settings,
    account: Account,
    *,
    now: datetime,
    session: AuthSession | None = None,
) -> AuthTokensResponse:
    access_token = new_access_token()
    refresh_token = new_refresh_token()
    if session is None:
        absolute_expiry = now + SESSION_ABSOLUTE_LIFETIME
        access_expiry = min(now + ACCESS_TOKEN_LIFETIME, absolute_expiry)
        session = AuthSession(
            account_id=account.id,
            access_token_digest=keyed_digest(
                settings, "access-token", access_token
            ),
            access_expires_at=access_expiry,
            created_at=now,
            absolute_expires_at=absolute_expiry,
        )
        db.add(session)
        db.flush()
    else:
        absolute_expiry = session.absolute_expires_at
        access_expiry = min(now + ACCESS_TOKEN_LIFETIME, absolute_expiry)
        session.access_token_digest = keyed_digest(
            settings, "access-token", access_token
        )
        session.access_expires_at = access_expiry

    expires_at = refresh_expiry(now, absolute_expiry)
    db.add(
        AuthRefreshToken(
            session_id=session.id,
            token_digest=keyed_digest(settings, "refresh-token", refresh_token),
            created_at=now,
            expires_at=expires_at,
        )
    )
    return AuthTokensResponse(
        access_token=access_token,
        expires_at=access_expiry,
        refresh_token=refresh_token,
        refresh_expires_at=expires_at,
        account=_account_state(account),
    )


def _challenge_error(db: Session, challenge: AuthChallenge | None, now: datetime) -> None:
    if challenge is None:
        raise APIError(400, "CODE_INVALID", "The code could not be verified.")
    if challenge.consumed_at is not None:
        raise APIError(400, "CODE_ALREADY_USED", "The code has already been used.")
    if challenge.expires_at <= now:
        challenge.consumed_at = now
        db.commit()
        raise APIError(400, "CODE_EXPIRED", "The code has expired.")


def _verify_challenge_code(
    db: Session,
    settings: Settings,
    challenge: AuthChallenge | None,
    code: str,
    *,
    now: datetime,
) -> AuthChallenge:
    _challenge_error(db, challenge, now)
    if challenge is None:
        raise APIError(400, "CODE_INVALID", "The code could not be verified.")
    expected = keyed_digest(
        settings,
        "auth-challenge",
        f"{challenge.purpose}:{challenge.id}:{code}",
    )
    if not secrets.compare_digest(challenge.code_digest, expected):
        challenge.attempt_count += 1
        if challenge.attempt_count >= CHALLENGE_ATTEMPT_LIMIT:
            challenge.consumed_at = now
        db.commit()
        raise APIError(400, "CODE_INVALID", "The code could not be verified.")
    return challenge


def _current_principal(
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
    settings = _settings(request)
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
    now = utc_now()
    if session.revoked_at is not None:
        raise APIError(401, "SESSION_REVOKED", "The session is no longer active.")
    if session.absolute_expires_at <= now or session.access_expires_at <= now:
        raise APIError(401, "SESSION_EXPIRED", "The session has expired.")
    return Principal(account=account, session=session)


def _revoke_account_sessions(db: Session, account_id: UUID, now: datetime) -> None:
    db.execute(
        update(AuthSession)
        .where(
            AuthSession.account_id == account_id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )


def _session_tokens_response(
    db: Session,
    settings: Settings,
    account: Account,
    session: AuthSession,
    *,
    now: datetime,
) -> AuthTokensResponse:
    db.scalars(
        select(AuthRefreshToken)
        .where(
            AuthRefreshToken.session_id == session.id,
            AuthRefreshToken.consumed_at.is_(None),
        )
        .with_for_update()
    ).all()
    db.execute(
        update(AuthRefreshToken)
        .where(
            AuthRefreshToken.session_id == session.id,
            AuthRefreshToken.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    return _create_tokens(db, settings, account, now=now, session=session)


@router.post(
    "/auth/register",
    response_model=ChallengeResponse,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "Email already registered"}},
)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ChallengeResponse:
    settings = _settings(request)
    email = str(payload.email)
    now = utc_now()
    enforce_rate_limits(
        db,
        settings,
        request,
        [_ip_limit("register-ip-hour", request, 5, 3600)],
        now=now,
    )
    account = Account(email=email, password_hash=hash_password(payload.password))
    db.add(account)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(
            409,
            "EMAIL_ALREADY_USED",
            "An account with this email already exists.",
        ) from exc
    challenge, code = _new_challenge(
        db, settings, account, "email_verification", now=now
    )
    db.commit()
    try:
        _deliver_challenge(_email_delivery(request), account, challenge, code)
    except EmailDeliveryError as exc:
        logger.warning(
            "Authentication email delivery failed; exception_type=%s",
            type(exc).__name__,
        )
        raise APIError(
            503,
            "SERVICE_UNAVAILABLE",
            "Email delivery is temporarily unavailable.",
        ) from exc
    return ChallengeResponse(
        challenge_id=challenge.id,
        masked_email=masked_email(account.email),
        expires_at=challenge.expires_at,
        resend_available_at=challenge.resend_available_at,
        account=_account_state(account),
    )


@router.post("/auth/email/verify", response_model=AccountState)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AccountState:
    settings = _settings(request)
    email = str(payload.email)
    now = utc_now()
    enforce_rate_limits(
        db,
        settings,
        request,
        [
            _ip_limit("verify-ip-15m", request, 10, 900),
            _email_limit("verify-email-15m", email, 10, 900),
        ],
        now=now,
    )
    challenge = db.scalar(
        select(AuthChallenge)
        .join(Account, Account.id == AuthChallenge.account_id)
        .where(
            AuthChallenge.id == payload.challenge_id,
            AuthChallenge.purpose == "email_verification",
            Account.email == email,
        )
        .with_for_update(of=AuthChallenge)
    )
    challenge = _verify_challenge_code(
        db, settings, challenge, payload.code, now=now
    )
    account = db.scalar(
        select(Account).where(Account.id == challenge.account_id).with_for_update()
    )
    if account is None:
        raise APIError(400, "CODE_INVALID", "The code could not be verified.")
    challenge.consumed_at = now
    if account.email_verified_at is None:
        account.email_verified_at = now
    db.commit()
    return _account_state(account)


@router.post(
    "/auth/email/resend",
    response_model=AcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def resend_email(
    payload: ResendEmailRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> AcceptedResponse:
    settings = _settings(request)
    email = str(payload.email)
    now = utc_now()
    enforce_rate_limits(
        db,
        settings,
        request,
        [
            _email_limit("resend-email-30s", email, 1, 30),
            _email_limit("resend-email-hour", email, 5, 3600),
        ],
        now=now,
    )
    account = db.scalar(
        select(Account).where(Account.email == email).with_for_update()
    )
    if account is None or account.email_verified_at is not None:
        return AcceptedResponse(
            message="If the account can receive a verification email, instructions will be sent."
        )
    active = db.scalar(
        select(AuthChallenge)
        .where(
            AuthChallenge.account_id == account.id,
            AuthChallenge.purpose == "email_verification",
            AuthChallenge.consumed_at.is_(None),
        )
        .with_for_update()
    )
    if active is not None and active.resend_available_at > now:
        seconds = max(1, int((active.resend_available_at - now).total_seconds()))
        raise APIError(
            429,
            "RATE_LIMITED",
            "Too many requests. Try again later.",
            retry_after_seconds=seconds,
        )
    challenge, code = _new_challenge(
        db, settings, account, "email_verification", now=now
    )
    db.commit()
    background_tasks.add_task(
        _send_challenge_non_enumerating,
        _email_delivery(request),
        AuthEmail(
            recipient=account.email,
            purpose=challenge.purpose,
            challenge_id=str(challenge.id),
            code=code,
            expires_at=challenge.expires_at.isoformat(),
        ),
    )
    return AcceptedResponse(
        message="If the account can receive a verification email, instructions will be sent."
    )


@router.post("/auth/login", response_model=AuthTokensResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokensResponse:
    settings = _settings(request)
    email = str(payload.email)
    now = utc_now()
    enforce_rate_limits(
        db,
        settings,
        request,
        [
            _email_limit("login-email-15m", email, 5, 900),
            _ip_limit("login-ip-15m", request, 10, 900),
        ],
        now=now,
    )
    account = db.scalar(select(Account).where(Account.email == email))
    if account is None:
        verify_dummy_password(payload.password)
        raise APIError(
            401,
            "INVALID_CREDENTIALS",
            "Email or password is incorrect.",
        )
    password_valid = verify_password(account.password_hash, payload.password)
    if not password_valid:
        raise APIError(
            401,
            "INVALID_CREDENTIALS",
            "Email or password is incorrect.",
        )
    if account.email_verified_at is None:
        raise APIError(
            403,
            "EMAIL_NOT_VERIFIED",
            "Verify your email before signing in.",
        )
    if password_hash_needs_rehash(account.password_hash):
        account.password_hash = hash_password(payload.password)
    response = _create_tokens(db, settings, account, now=now)
    db.commit()
    return response


@router.post("/auth/refresh", response_model=AuthTokensResponse)
def refresh(
    payload: RefreshRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokensResponse:
    settings = _settings(request)
    now = utc_now()
    token_digest = keyed_digest(settings, "refresh-token", payload.refresh_token)
    enforce_rate_limits(
        db,
        settings,
        request,
        [
            _ip_limit("refresh-ip-15m", request, 10, 900),
            RateLimit("refresh-token-15m", token_digest, 10, 900),
        ],
        now=now,
    )
    refresh_token = db.scalar(
        select(AuthRefreshToken)
        .where(AuthRefreshToken.token_digest == token_digest)
        .with_for_update()
    )
    if refresh_token is None:
        raise APIError(
            401,
            "INVALID_REFRESH_TOKEN",
            "The refresh token is not valid.",
        )
    session = db.scalar(
        select(AuthSession)
        .where(AuthSession.id == refresh_token.session_id)
        .with_for_update()
    )
    if session is None or session.revoked_at is not None:
        raise APIError(401, "SESSION_REVOKED", "The session is no longer active.")
    if refresh_token.consumed_at is not None:
        session.revoked_at = now
        db.commit()
        raise APIError(
            401,
            "SESSION_REVOKED",
            "Refresh token reuse revoked this session.",
        )
    if refresh_token.expires_at <= now or session.absolute_expires_at <= now:
        session.revoked_at = now
        refresh_token.consumed_at = now
        db.commit()
        raise APIError(401, "SESSION_EXPIRED", "The session has expired.")
    account = db.scalar(select(Account).where(Account.id == session.account_id))
    if account is None:
        session.revoked_at = now
        db.commit()
        raise APIError(401, "SESSION_REVOKED", "The session is no longer active.")
    refresh_token.consumed_at = now
    response = _create_tokens(db, settings, account, now=now, session=session)
    db.commit()
    return response


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    principal: Principal = Depends(_current_principal),
    db: Session = Depends(get_db),
) -> Response:
    principal.session.revoked_at = utc_now()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=AccountState)
def current_account(
    principal: Principal = Depends(_current_principal),
) -> AccountState:
    return _account_state(principal.account)


@router.post("/me/onboarding/profile-completed", response_model=AccountState)
def mark_profile_completed(
    principal: Principal = Depends(_current_principal),
    db: Session = Depends(get_db),
) -> AccountState:
    if principal.account.email_verified_at is None:
        raise APIError(
            403,
            "EMAIL_NOT_VERIFIED",
            "Verify your email before completing onboarding.",
        )
    principal.account.profile_completed = True
    db.commit()
    return _account_state(principal.account)


@router.post(
    "/auth/password/reset/request",
    response_model=PasswordResetRequestedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_password_reset(
    payload: ResendEmailRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> PasswordResetRequestedResponse:
    settings = _settings(request)
    email = str(payload.email)
    now = utc_now()
    enforce_rate_limits(
        db,
        settings,
        request,
        [
            _email_limit("reset-request-email-30s", email, 1, 30),
            _email_limit("reset-request-email-hour", email, 3, 3600),
            _ip_limit("reset-request-ip-hour", request, 10, 3600),
        ],
        now=now,
    )
    account = db.scalar(select(Account).where(Account.email == email).with_for_update())
    if account is not None:
        challenge, code = _new_challenge(
            db, settings, account, "password_reset", now=now
        )
        db.commit()
        background_tasks.add_task(
            _send_challenge_non_enumerating,
            _email_delivery(request),
            AuthEmail(
                recipient=account.email,
                purpose=challenge.purpose,
                challenge_id=str(challenge.id),
                code=code,
                expires_at=challenge.expires_at.isoformat(),
            ),
        )
    return PasswordResetRequestedResponse()


@router.post(
    "/auth/password/reset/confirm",
    response_model=PasswordResetConfirmedResponse,
)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PasswordResetConfirmedResponse:
    settings = _settings(request)
    email = str(payload.email)
    now = utc_now()
    email_digest = keyed_digest(settings, "rate-limit-email", email)
    enforce_rate_limits(
        db,
        settings,
        request,
        [
            _ip_limit("reset-confirm-ip-hour", request, 10, 3600),
            RateLimit("reset-confirm-email-hour", email_digest, 5, 3600),
        ],
        now=now,
    )
    account = db.scalar(select(Account).where(Account.email == email).with_for_update())
    challenge = None
    if account is not None:
        challenge = db.scalar(
            select(AuthChallenge)
            .where(
                AuthChallenge.account_id == account.id,
                AuthChallenge.purpose == "password_reset",
            )
            .order_by(AuthChallenge.created_at.desc())
            .with_for_update()
        )
    challenge = _verify_challenge_code(
        db, settings, challenge, payload.code, now=now
    )
    if account is None:
        raise APIError(400, "CODE_INVALID", "The code could not be verified.")
    challenge.consumed_at = now
    account.password_hash = hash_password(payload.password)
    _revoke_account_sessions(db, account.id, now)
    db.commit()
    return PasswordResetConfirmedResponse()


@router.put("/me/password", response_model=AuthTokensResponse)
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    principal: Principal = Depends(_current_principal),
    db: Session = Depends(get_db),
) -> AuthTokensResponse:
    settings = _settings(request)
    now = utc_now()
    enforce_rate_limits(
        db,
        settings,
        request,
        [
            RateLimit("password-change-account-15m", str(principal.account.id), 5, 900),
            _ip_limit("password-change-ip-15m", request, 10, 900),
        ],
        now=now,
    )
    if not verify_password(principal.account.password_hash, payload.current_password):
        raise APIError(
            401,
            "INVALID_CREDENTIALS",
            "Current password is incorrect.",
        )
    principal.account.password_hash = hash_password(payload.new_password)
    db.execute(
        update(AuthSession)
        .where(
            AuthSession.account_id == principal.account.id,
            AuthSession.id != principal.session.id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    response = _session_tokens_response(
        db,
        settings,
        principal.account,
        principal.session,
        now=now,
    )
    db.commit()
    return response
