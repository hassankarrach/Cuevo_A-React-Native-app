import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol

from app.core.config import Settings


@dataclass(frozen=True)
class AuthEmail:
    recipient: str
    purpose: str
    challenge_id: str
    code: str
    expires_at: str


class EmailDelivery(Protocol):
    def send_challenge(self, message: AuthEmail) -> None: ...


class EmailDeliveryError(Exception):
    pass


class SMTPEmailDelivery:
    def __init__(self, settings: Settings) -> None:
        self._host = settings.email_smtp_host
        self._port = settings.email_smtp_port
        self._from_address = settings.email_from_address

    def send_challenge(self, message: AuthEmail) -> None:
        email = EmailMessage()
        email["From"] = self._from_address
        email["To"] = message.recipient
        email["Subject"] = (
            "Verify your Cuevo email"
            if message.purpose == "email_verification"
            else "Reset your Cuevo password"
        )
        email.set_content(
            f"Your Cuevo code is {message.code}.\n"
            f"Challenge ID: {message.challenge_id}\n"
            f"This code expires at {message.expires_at}. "
            "If you did not request this, you can ignore this message.\n"
        )
        try:
            with smtplib.SMTP(self._host, self._port, timeout=5) as smtp:
                smtp.send_message(email)
        except (OSError, smtplib.SMTPException) as exc:
            raise EmailDeliveryError from exc


class InMemoryEmailDelivery:
    def __init__(self) -> None:
        self.messages: list[AuthEmail] = []

    def send_challenge(self, message: AuthEmail) -> None:
        self.messages.append(message)
