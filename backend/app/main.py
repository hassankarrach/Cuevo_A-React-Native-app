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
from app.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
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
    return app


app = create_app()
