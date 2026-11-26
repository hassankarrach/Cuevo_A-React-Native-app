from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_db_engine


router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    api: str
    database: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Process and database readiness",
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": HealthResponse,
            "description": "The API is running, but the database is unavailable.",
            "headers": {
                "X-Request-ID": {
                    "description": "Correlation ID for this request.",
                    "schema": {"type": "string", "format": "uuid"},
                }
            },
            "content": {
                "application/json": {
                    "examples": {
                        "databaseUnavailable": {
                            "summary": "Database is not ready",
                            "value": {
                                "status": "unavailable",
                                "api": "ready",
                                "database": "unavailable",
                            },
                        }
                    }
                }
            },
        }
    },
)
def health(db_engine: Engine = Depends(get_db_engine)) -> JSONResponse:
    try:
        with db_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        payload = HealthResponse(status="ok", api="ready", database="ready")
        return JSONResponse(status_code=status.HTTP_200_OK, content=payload.model_dump())
    except (SQLAlchemyError, ConnectionError, TimeoutError):
        payload = HealthResponse(status="unavailable", api="ready", database="unavailable")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload.model_dump(),
        )
