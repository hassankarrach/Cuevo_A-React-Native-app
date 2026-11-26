from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from math import ceil

from fastapi import Request
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.api.errors import APIError
from app.auth.models import AuthRateLimitBucket
from app.auth.security import keyed_digest
from app.core.config import Settings


@dataclass(frozen=True)
class RateLimit:
    name: str
    subject: str
    maximum: int
    window_seconds: int


def client_ip(request: Request) -> str:
    return request.client.host if request.client is not None else "unknown"


def enforce_rate_limits(
    db: Session,
    settings: Settings,
    request: Request,
    limits: list[RateLimit],
    *,
    now: datetime,
) -> None:
    now = now.astimezone(UTC)
    retry_after = 0
    for limit in limits:
        window_epoch = int(now.timestamp()) // limit.window_seconds * limit.window_seconds
        window_start = datetime.fromtimestamp(window_epoch, UTC)
        bucket_key = keyed_digest(
            settings,
            "rate-limit",
            f"{limit.name}:{limit.subject}:{window_epoch}",
        )
        statement = (
            insert(AuthRateLimitBucket)
            .values(
                bucket_key=bucket_key,
                window_start=window_start,
                request_count=1,
            )
            .on_conflict_do_update(
                index_elements=[AuthRateLimitBucket.bucket_key],
                set_={
                    "request_count": AuthRateLimitBucket.request_count + 1,
                },
            )
            .returning(AuthRateLimitBucket.request_count)
        )
        count = db.scalar(statement)
        if count is not None and count > limit.maximum:
            window_end = window_start + timedelta(seconds=limit.window_seconds)
            retry_after = max(retry_after, ceil((window_end - now).total_seconds()))
    db.execute(
        delete(AuthRateLimitBucket).where(
            AuthRateLimitBucket.window_start < now - timedelta(days=1)
        )
    )
    db.commit()
    if retry_after:
        raise APIError(
            429,
            "RATE_LIMITED",
            "Too many requests. Try again later.",
            retry_after_seconds=max(1, retry_after),
        )
