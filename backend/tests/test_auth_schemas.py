import pytest
from pydantic import ValidationError

from app.auth.schemas import RegisterRequest
from app.auth.security import hash_password, verify_password


def test_email_is_trimmed_lowercased_and_password_is_preserved() -> None:
    composed = "é" * 8
    request = RegisterRequest(
        email="  Person@Example.COM  ",
        password=composed,
    )
    assert str(request.email) == "person@example.com"
    password_hash = hash_password(request.password)
    assert verify_password(password_hash, composed)
    assert not verify_password(password_hash, "e\u0301" * 8)


def test_password_codepoint_and_utf8_byte_limits() -> None:
    valid = RegisterRequest(
        email="unicode@example.com",
        password="😀" * 128,
    )
    assert len(valid.password) == 128
    assert len(valid.password.encode("utf-8")) == 512

    with pytest.raises(ValidationError):
        RegisterRequest(email="short@example.com", password="short7")

    with pytest.raises(ValidationError):
        RegisterRequest(
            email="long@example.com",
            password="😀" * 129,
        )


def test_email_length_limit_is_enforced() -> None:
    local_part = "a" * 243
    with pytest.raises(ValidationError):
        RegisterRequest(
            email=f"{local_part}@example.com",
            password="passphrase-one",
        )
