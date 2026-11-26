import logging
import re
from collections.abc import Mapping, Sequence
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger(__name__)
_SAFE_CODE = re.compile(r"^[A-Z][A-Z0-9_]{0,63}$")
_SAFE_FIELD = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]{0,63}$")
_SUPPORTED_API_ERROR_STATUSES = {400, 401, 403, 404, 409, 422, 429, 503}
_SENSITIVE_FIELD_PARTS = (
    "password",
    "token",
    "secret",
    "challenge",
    "credential",
    "authorization",
    "cookie",
)

REQUEST_ID_HEADER = "X-Request-ID"


class FieldError(BaseModel):
    field: str
    code: str
    message: str


class ErrorBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    fieldErrors: list[FieldError] | None = None
    requestId: str
    details: dict[str, str | int | float | bool | None] | None = None


class ErrorEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ErrorBody


class APIError(Exception):
    """An expected API failure with a deliberately public response payload."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        *,
        field_errors: Sequence[FieldError] | None = None,
        details: Mapping[str, str | int | float | bool | None] | None = None,
        retry_after_seconds: int | None = None,
    ) -> None:
        if status_code not in _SUPPORTED_API_ERROR_STATUSES:
            raise ValueError("Unsupported API error status")
        if not _SAFE_CODE.fullmatch(code):
            raise ValueError("API error codes must be stable uppercase identifiers")
        if retry_after_seconds is not None and (
            status_code != 429 or not 0 <= retry_after_seconds <= 86_400
        ):
            raise ValueError("Retry delay must be between 0 and 86400 seconds on 429 errors")
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.public_message = message
        self.field_errors = list(field_errors) if field_errors is not None else None
        self.details = dict(details) if details is not None else None
        self.retry_after_seconds = retry_after_seconds


_HTTP_ERROR_DEFAULTS: dict[int, tuple[str, str]] = {
    400: ("BAD_REQUEST", "The request could not be processed."),
    401: ("AUTHENTICATION_REQUIRED", "Authentication is required."),
    403: ("FORBIDDEN", "You are not allowed to perform this action."),
    404: ("NOT_FOUND", "The requested resource was not found."),
    405: ("METHOD_NOT_ALLOWED", "This method is not allowed for the resource."),
    409: ("REVISION_CONFLICT", "The resource has changed. Refresh and try again."),
    422: ("VALIDATION_ERROR", "Request validation failed."),
    429: ("RATE_LIMITED", "Too many requests. Try again later."),
    503: ("SERVICE_UNAVAILABLE", "The service is temporarily unavailable."),
    500: ("INTERNAL_ERROR", "An unexpected error occurred."),
}


def _request_id(request: Request) -> str:
    value = getattr(request.state, "request_id", None)
    if isinstance(value, str):
        return value
    value = str(uuid4())
    request.state.request_id = value
    return value


def _response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    *,
    field_errors: Sequence[FieldError] | None = None,
    details: Mapping[str, str | int | float | bool | None] | None = None,
    retry_after_seconds: int | None = None,
) -> JSONResponse:
    body = ErrorEnvelope(
        error=ErrorBody(
            code=code,
            message=message,
            fieldErrors=list(field_errors) if field_errors else None,
            requestId=_request_id(request),
            details=dict(details) if details else None,
        )
    )
    response = JSONResponse(
        status_code=status_code,
        content=body.model_dump(exclude_none=True, by_alias=True),
        headers={REQUEST_ID_HEADER: _request_id(request)},
    )
    if retry_after_seconds is not None:
        response.headers["Retry-After"] = str(retry_after_seconds)
    return response


def _safe_validation_field(location: Sequence[Any]) -> str:
    segments: list[str] = []
    for part in location:
        if isinstance(part, str) and part in {"body", "query", "path", "header", "cookie"}:
            continue
        if not isinstance(part, str) or not _SAFE_FIELD.fullmatch(part):
            continue
        lowered = part.lower()
        if any(sensitive in lowered for sensitive in _SENSITIVE_FIELD_PARTS):
            continue
        segments.append(part)
    return ".".join(segments) or "request"


def _validation_field_errors(exc: RequestValidationError) -> list[FieldError]:
    result: list[FieldError] = []
    for error in exc.errors():
        error_type = error.get("type")
        code = (
            error_type
            if isinstance(error_type, str) and _SAFE_CODE.fullmatch(error_type.upper())
            else "INVALID"
        )
        message = "Field is required." if error_type == "missing" else "Invalid value."
        result.append(
            FieldError(
                field=_safe_validation_field(error.get("loc", ())),
                code=code.lower(),
                message=message,
            )
        )
    return result


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        return _response(
            request,
            exc.status_code,
            exc.code,
            exc.public_message,
            field_errors=exc.field_errors,
            details=exc.details,
            retry_after_seconds=exc.retry_after_seconds,
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        code, message = _HTTP_ERROR_DEFAULTS[422]
        return _response(
            request,
            422,
            code,
            message,
            field_errors=_validation_field_errors(exc),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code, message = _HTTP_ERROR_DEFAULTS.get(
            exc.status_code,
            ("HTTP_ERROR", "The request could not be completed."),
        )
        return _response(request, exc.status_code, code, message)

def _example(
    code: str,
    message: str,
    request_id: str = "00000000-0000-4000-8000-000000000000",
    **optional_fields: Any,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "requestId": request_id,
            **optional_fields,
        }
    }


def install_openapi_contract(app: FastAPI) -> None:
    defaults = {
        status_code: _HTTP_ERROR_DEFAULTS[status_code]
        for status_code in (400, 401, 403, 404, 405, 409, 422, 429, 500, 503)
    }
    schema_names = {
        400: "BadRequest",
        401: "AuthenticationRequired",
        403: "Forbidden",
        404: "NotFound",
        405: "MethodNotAllowed",
        409: "RevisionConflict",
        422: "ValidationError",
        429: "RateLimited",
        500: "InternalError",
        503: "ServiceUnavailable",
    }

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema is not None:
            return app.openapi_schema

        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        error_schema = ErrorEnvelope.model_json_schema(
            ref_template="#/components/schemas/{model}"
        )
        definitions = error_schema.pop("$defs", {})
        components = schema.setdefault("components", {})
        schemas = components.setdefault("schemas", {})
        schemas.update(definitions)
        schemas["ErrorEnvelope"] = error_schema
        responses = components.setdefault("responses", {})

        for status_code, (code, message) in defaults.items():
            response_name = schema_names[status_code]
            example_value = _example(code, message)
            if status_code == 422:
                example_value["error"]["fieldErrors"] = [
                    {
                        "field": "name",
                        "code": "missing",
                        "message": "Field is required.",
                    }
                ]
            responses[response_name] = {
                "description": message,
                "headers": {
                    REQUEST_ID_HEADER: {
                        "description": "Correlation ID for this request.",
                        "schema": {"type": "string", "format": "uuid"},
                    }
                },
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorEnvelope"},
                        "examples": {
                            code: {
                                "summary": message,
                                "value": example_value,
                            }
                        },
                    }
                },
            }
            if status_code == 429:
                responses[response_name]["headers"]["Retry-After"] = {
                    "description": "Minimum delay before retrying, in seconds.",
                    "schema": {"type": "integer", "minimum": 0},
                    "example": 30,
                }

        request_id_header = {
            "description": "Correlation ID for this request.",
            "schema": {"type": "string", "format": "uuid"},
        }
        for path_item in schema.get("paths", {}).values():
            for operation in path_item.values():
                if not isinstance(operation, dict) or "responses" not in operation:
                    continue
                for response in operation["responses"].values():
                    response.setdefault("headers", {}).setdefault(
                        REQUEST_ID_HEADER,
                        request_id_header,
                    )

        schema["x-proposed-api-conventions"] = {
            "reviewStatus": "Proposed; frontend approval is pending.",
            "productPaths": "/api/v1",
            "jsonPropertyCasing": "camelCase",
            "ids": "Opaque strings; UUIDs are a possible representation, not a requirement.",
            "timestamps": "UTC RFC 3339 strings.",
            "durations": "Milliseconds in properties with an Ms suffix.",
            "pagination": {
                "shape": {"items": [], "nextCursor": None},
                "requirements": "Bounded page size and stable documented ordering.",
            },
            "retryableMutations": [
                "expected resource revision",
                "operation or idempotency ID",
            ],
            "capabilities": "Return viewer-specific permissions and reauthorize every mutation.",
        }
        schema["x-proposed-http-error-responses"] = {
            str(status_code): {
                "$ref": f"#/components/responses/{schema_names[status_code]}"
            }
            for status_code in defaults
        }
        schema["x-proposed-websocket-event-envelope"] = {
            "reviewStatus": "Proposed; event ordering, replay, and authentication remain open.",
            "example": {
                "eventId": "opaque-event-id",
                "type": "resource.updated",
                "occurredAt": "2026-01-01T12:00:00Z",
                "resource": {
                    "type": "resource-type",
                    "id": "opaque-resource-id",
                    "revision": "opaque-revision",
                },
                "data": {},
            },
        }
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi


def unexpected_error_response(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled API exception request_id=%s exception_type=%s",
        _request_id(request),
        type(exc).__name__,
    )
    return _response(
        request,
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
    )
