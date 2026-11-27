from typing import Callable
from uuid import UUID, uuid4

from fastapi import FastAPI, Request
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app.api.errors import (
    install_openapi_contract,
    register_exception_handlers,
    unexpected_error_response,
)
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.profiles import router as profiles_router
from app.notifications.routes import router as notifications_router
from app.catalog.routes import router as catalog_router
from app.auth.email import EmailDelivery, SMTPEmailDelivery
from app.auth.google import VerifiedGoogleIdentity, verify_google_id_token
from app.core.config import Settings, get_settings


def create_app(
    settings: Settings | None = None,
    email_delivery: EmailDelivery | None = None,
    google_token_verifier: Callable[[str, str, str], VerifiedGoogleIdentity]
    | None = None,
) -> FastAPI:
    config = settings or get_settings()
    app = FastAPI(
        title="Cuevo API",
        description=(
            "Cuevo is the repository name for the project specified as "
            "Music Room in the project subject."
        ),
        version="0.1.0",
    )
    app.state.settings = config
    app.state.email_delivery = email_delivery or SMTPEmailDelivery(config)
    app.state.google_token_verifier = google_token_verifier or verify_google_id_token

    @app.middleware("http")
    async def request_id_middleware(
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        supplied_request_id = request.headers.get("X-Request-ID", "")
        try:
            parsed_request_id = UUID(supplied_request_id)
            request_id = (
                str(parsed_request_id)
                if str(parsed_request_id) == supplied_request_id.lower()
                else str(uuid4())
            )
        except (ValueError, AttributeError):
            request_id = str(uuid4())
        request.state.request_id = request_id
        try:
            response = await call_next(request)
        except Exception as exc:
            response = unexpected_error_response(request, exc)
        response.headers["X-Request-ID"] = request_id
        return response

    register_exception_handlers(app)
    install_openapi_contract(app)
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(profiles_router)
    app.include_router(notifications_router)
    app.include_router(catalog_router)
    return app


app = create_app()
