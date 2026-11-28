import queue
from dataclasses import dataclass, field
from threading import Lock
from collections.abc import Callable
from uuid import UUID
from typing import Any


_CLOSED = object()
_MAX_PENDING_EVENTS = 64


@dataclass(eq=False)
class RoomSubscription:
    room_id: UUID
    account_id: UUID
    session_id: UUID
    access_token_digest: str
    last_revision: int = 0
    events: queue.Queue[Any] = field(
        default_factory=lambda: queue.Queue(maxsize=_MAX_PENDING_EVENTS)
    )
    pending: dict[int, dict[str, object]] = field(default_factory=dict)


class RoomEventHub:
    def __init__(self) -> None:
        self._lock = Lock()
        self._subscriptions: set[RoomSubscription] = set()

    def subscribe(
        self,
        room_id: UUID,
        account_id: UUID,
        session_id: UUID,
        access_token_digest: str,
        after_revision: int,
    ) -> RoomSubscription:
        subscription = RoomSubscription(
            room_id=room_id,
            account_id=account_id,
            session_id=session_id,
            access_token_digest=access_token_digest,
            last_revision=after_revision,
        )
        with self._lock:
            self._subscriptions.add(subscription)
        return subscription

    def unsubscribe(self, subscription: RoomSubscription) -> None:
        with self._lock:
            self._subscriptions.discard(subscription)

    def publish(
        self,
        room_id: UUID,
        event: dict[str, object],
        is_authorized: Callable[[RoomSubscription], bool],
        *,
        close_after_publish: bool = False,
    ) -> None:
        with self._lock:
            subscribers = [
                item for item in self._subscriptions if item.room_id == room_id
            ]
        for subscription in subscribers:
            if not is_authorized(subscription):
                self._close(subscription)
                continue
            self._deliver_in_revision_order(subscription, event)
            if close_after_publish:
                self._close(subscription)

    def set_revision(self, subscription: RoomSubscription, revision: int) -> None:
        with self._lock:
            subscription.last_revision = revision
            subscription.pending = {
                key: value
                for key, value in subscription.pending.items()
                if key > revision
            }
            flushed = self._flush_pending(subscription)
        if not flushed:
            self._close(subscription)

    def _deliver_in_revision_order(
        self,
        subscription: RoomSubscription,
        event: dict[str, object],
    ) -> None:
        try:
            revision = int(str(event["revision"]))
        except (KeyError, ValueError):
            self._close(subscription)
            return
        with self._lock:
            if subscription not in self._subscriptions:
                return
            if revision <= subscription.last_revision:
                return
            subscription.pending[revision] = event
            overflow = len(subscription.pending) > _MAX_PENDING_EVENTS
            if not overflow:
                overflow = not self._flush_pending(subscription)
        if overflow:
            self._close(subscription)

    def _flush_pending(self, subscription: RoomSubscription) -> bool:
        while subscription.last_revision + 1 in subscription.pending:
            event = subscription.pending.pop(subscription.last_revision + 1)
            try:
                subscription.events.put_nowait(event)
            except queue.Full:
                return False
            subscription.last_revision += 1
        return True

    def _close(self, subscription: RoomSubscription) -> None:
        with self._lock:
            self._subscriptions.discard(subscription)
        try:
            subscription.events.put_nowait(_CLOSED)
        except queue.Full:
            try:
                subscription.events.get_nowait()
            except queue.Empty:
                pass
            subscription.events.put_nowait(_CLOSED)


def closed_signal() -> object:
    return _CLOSED
