from fastapi import FastAPI

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
    app.include_router(health_router)
    return app


app = create_app()
