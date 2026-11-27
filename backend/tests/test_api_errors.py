from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.testclient import TestClient

from app.api.errors import APIError, FieldError
from app.core.config import Settings
from app.main import create_app


def build_client() -> TestClient:
    settings = Settings(
        auth_secret_key="test-only-auth-secret-key-not-for-production",
        environment="test",
        database_url="postgresql+psycopg://cuevo:local@localhost:5432/cuevo_dev",
        test_database_url="postgresql+psycopg://cuevo:local@localhost:5432/cuevo_test",
        _env_file=None,
    )
    app = create_app(settings)
    test_routes = APIRouter()

    @test_routes.get("/probe/validation")
    def validation_probe(count: int) -> dict[str, int]:
        return {"count": count}

    @test_routes.get("/probe/http/{status_code}")
    def http_error_probe(status_code: int) -> None:
        raise HTTPException(
            status_code=status_code,
            detail="database password=secret-token challenge=private",
        )

    @test_routes.get("/probe/custom-error")
    def custom_error_probe() -> None:
        raise APIError(
            409,
            "PLAYLIST_REVISION_CONFLICT",
            "The playlist changed. Refresh and try again.",
            field_errors=[
                FieldError(
                    field="expectedRevision",
                    code="stale_revision",
                    message="Refresh the resource before retrying.",
                )
            ],
            details={"currentRevision": "revision-2"},
        )

    @test_routes.get("/probe/throttled")
    def throttled_probe() -> None:
        raise APIError(
            429,
            "RATE_LIMITED",
            "Too many requests. Try again later.",
            retry_after_seconds=30,
        )

    @test_routes.get("/probe/unexpected")
    def unexpected_probe() -> None:
        raise RuntimeError(
            "SELECT * FROM accounts WHERE token='secret-token' challenge='private'"
        )

    app.include_router(test_routes)
    return TestClient(app, raise_server_exceptions=False)


def assert_error_response(response, status_code: int, code: str) -> dict:
    assert response.status_code == status_code
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == code
    assert body["error"]["message"]
    assert body["error"]["requestId"] == response.headers["X-Request-ID"]
    UUID(body["error"]["requestId"])
    return body["error"]


def test_validation_error_uses_safe_envelope_and_redacts_input() -> None:
    client = build_client()

    response = client.get("/probe/validation", params={"count": "secret-token"})

    error = assert_error_response(response, 422, "VALIDATION_ERROR")
    assert error["fieldErrors"] == [
        {"field": "count", "code": "int_parsing", "message": "Invalid value."}
    ]
    assert "secret-token" not in response.text
    assert "input" not in response.text


def test_http_exception_statuses_map_to_stable_codes_without_details() -> None:
    client = build_client()
    expected = {
        401: "AUTHENTICATION_REQUIRED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "REVISION_CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        429: "RATE_LIMITED",
        503: "SERVICE_UNAVAILABLE",
    }

    for status_code, code in expected.items():
        response = client.get(f"/probe/http/{status_code}")
        assert_error_response(response, status_code, code)
        assert "secret-token" not in response.text
        assert "database" not in response.text

    missing_response = client.get("/resource-that-does-not-exist")
    assert_error_response(missing_response, 404, "NOT_FOUND")


def test_resource_specific_error_fields_and_safe_details_are_preserved() -> None:
    client = build_client()

    response = client.get("/probe/custom-error")

    error = assert_error_response(response, 409, "PLAYLIST_REVISION_CONFLICT")
    assert error["fieldErrors"] == [
        {
            "field": "expectedRevision",
            "code": "stale_revision",
            "message": "Refresh the resource before retrying.",
        }
    ]
    assert error["details"] == {"currentRevision": "revision-2"}


def test_rate_limit_has_safe_retry_after_and_unexpected_failure_is_redacted(
    caplog,
) -> None:
    client = build_client()

    throttled = client.get("/probe/throttled")
    assert_error_response(throttled, 429, "RATE_LIMITED")
    assert throttled.headers["Retry-After"] == "30"

    unexpected = client.get("/probe/unexpected")
    assert_error_response(unexpected, 500, "INTERNAL_ERROR")
    assert "SELECT" not in unexpected.text
    assert "secret-token" not in unexpected.text
    assert "private" not in unexpected.text
    assert "SELECT" not in caplog.text
    assert "secret-token" not in caplog.text
    assert "private" not in caplog.text


def test_request_id_is_propagated_only_when_canonical_and_otherwise_generated() -> None:
    client = build_client()
    supplied_id = "123e4567-e89b-12d3-a456-426614174000"

    propagated = client.get(
        "/probe/http/401",
        headers={"X-Request-ID": supplied_id},
    )
    assert propagated.headers["X-Request-ID"] == supplied_id
    assert propagated.json()["error"]["requestId"] == supplied_id

    malformed = client.get(
        "/probe/http/401",
        headers={"X-Request-ID": "not-a-safe-request-id"},
    )
    generated_id = malformed.headers["X-Request-ID"]
    assert generated_id != "not-a-safe-request-id"
    assert malformed.json()["error"]["requestId"] == generated_id
    UUID(generated_id)


def test_openapi_contains_error_and_websocket_contract_examples() -> None:
    client = build_client()

    schema = client.get("/openapi.json").json()

    assert "/health" in schema["paths"]
    assert "503" in schema["paths"]["/health"]["get"]["responses"]
    assert "ErrorEnvelope" in schema["components"]["schemas"]
    assert schema["components"]["responses"]["ValidationError"]["content"][
        "application/json"
    ]["examples"]["VALIDATION_ERROR"]["value"]["error"]["fieldErrors"]
    assert "X-Request-ID" in schema["components"]["responses"]["RateLimited"]["headers"]
    assert "Retry-After" in schema["components"]["responses"]["RateLimited"]["headers"]
    assert schema["paths"]["/api/v1/auth/register"]["post"]["responses"]["201"]
    assert schema["paths"]["/api/v1/me"]["get"]["security"] == [{"BearerAuth": []}]
    assert schema["components"]["securitySchemes"]["BearerAuth"] == {
        "type": "http",
        "scheme": "bearer",
    }
    assert "X-Request-ID" in schema["paths"]["/health"]["get"]["responses"]["200"][
        "headers"
    ]
    assert schema["x-proposed-api-conventions"]["productPaths"] == "/api/v1"
    assert schema["x-proposed-websocket-event-envelope"]["example"]["eventId"]
