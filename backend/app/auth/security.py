import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import Settings


ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
REFRESH_IDLE_LIFETIME = timedelta(days=30)
SESSION_ABSOLUTE_LIFETIME = timedelta(days=90)
CHALLENGE_LIFETIME = timedelta(minutes=15)
RESEND_COOLDOWN = timedelta(seconds=30)
CHALLENGE_ATTEMPT_LIMIT = 5

_PASSWORD_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65_536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)
_DUMMY_PASSWORD_HASH = _PASSWORD_HASHER.hash("not-a-real-cuevo-password")


def utc_now() -> datetime:
    return datetime.now(UTC)


def hash_password(password: str) -> str:
    return _PASSWORD_HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _PASSWORD_HASHER.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def verify_dummy_password(password: str) -> None:
    verify_password(_DUMMY_PASSWORD_HASH, password)


def password_hash_needs_rehash(password_hash: str) -> bool:
    try:
        return _PASSWORD_HASHER.check_needs_rehash(password_hash)
    except InvalidHashError:
        return False


def new_access_token() -> str:
    return secrets.token_urlsafe(32)


def new_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def new_challenge_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def keyed_digest(settings: Settings, purpose: str, value: str) -> str:
    key = settings.auth_secret_key.get_secret_value().encode("utf-8")
    message = f"{purpose}:{value}".encode("utf-8")
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def masked_email(email: str) -> str:
    local, separator, domain = email.partition("@")
    if not separator:
        return "***"
    visible = local[:1]
    return f"{visible}{'*' * max(2, len(local) - 1)}@{domain}"


def refresh_expiry(now: datetime, absolute_expiry: datetime) -> datetime:
    return min(now + REFRESH_IDLE_LIFETIME, absolute_expiry)
