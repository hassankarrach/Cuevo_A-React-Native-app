from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class AuthModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=False,
    )


class EmailInput(AuthModel):
    email: EmailStr = Field(max_length=254)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class PasswordInput(AuthModel):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def enforce_password_byte_limit(cls, value: str) -> str:
        try:
            encoded = value.encode("utf-8")
        except UnicodeEncodeError as exc:
            raise ValueError("Password must contain valid Unicode scalar values") from exc
        if len(encoded) > 512:
            raise ValueError("Password must not exceed 512 UTF-8 bytes")
        return value


class RegisterRequest(EmailInput, PasswordInput):
    pass


class LoginRequest(EmailInput, PasswordInput):
    pass


class VerifyEmailRequest(EmailInput):
    challenge_id: UUID
    code: str = Field(pattern=r"^[0-9]{6}$")


class ResendEmailRequest(EmailInput):
    pass


class RefreshRequest(AuthModel):
    refresh_token: str = Field(min_length=32, max_length=128)


class PasswordResetConfirmRequest(EmailInput, PasswordInput):
    code: str = Field(pattern=r"^[0-9]{6}$")


class PasswordChangeRequest(AuthModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("current_password", "new_password")
    @classmethod
    def enforce_password_byte_limit(cls, value: str) -> str:
        try:
            encoded = value.encode("utf-8")
        except UnicodeEncodeError as exc:
            raise ValueError("Password must contain valid Unicode scalar values") from exc
        if len(encoded) > 512:
            raise ValueError("Password must not exceed 512 UTF-8 bytes")
        return value

    @model_validator(mode="after")
    def require_changed_password(self) -> "PasswordChangeRequest":
        if self.current_password == self.new_password:
            raise ValueError("New password must differ from current password")
        return self


class AccountState(AuthModel):
    id: UUID
    email: EmailStr
    email_verified: bool
    profile_completed: bool
    onboarding_step: Literal["VERIFY_EMAIL", "SET_UP_PROFILE", "HOME"]
    created_at: datetime


class ChallengeResponse(AuthModel):
    challenge_id: UUID
    masked_email: str
    expires_at: datetime
    resend_available_at: datetime
    account: AccountState


class AcceptedResponse(AuthModel):
    accepted: bool = True
    message: str


class AuthTokensResponse(AuthModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_at: datetime
    refresh_token: str
    refresh_expires_at: datetime
    account: AccountState


class PasswordResetRequestedResponse(AuthModel):
    accepted: Literal[True] = True
    message: str = "If the account exists, password-reset instructions will be sent."


class PasswordResetConfirmedResponse(AuthModel):
    changed: Literal[True] = True
